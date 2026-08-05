import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { persistProviderCheckout } from "@/lib/financial/payment-persistence";
import { getPaymentMethod } from "@/lib/payment-methods";
import { prisma } from "@/lib/prisma";
import {
  calculateAmountWithTax,
  createSha7nawyPayment,
  SHA7NAWY_PENDING_TYPE,
  sha7nawyRefNote,
} from "@/lib/sha7nawy";
import {
  createShakeOutPayment,
  SHAKEOUT_PENDING_TYPE,
  shakeOutRefNote,
} from "@/lib/shakeout";

/** Sha7nawy wallet methods only — never WE Pay, cards, or InstaPay. */
const SHA7NAWY_WALLET_METHODS = new Set(["vf_cash", "et_cash", "or_cash"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولاً" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { number, amount, method, courseTitle } = body as {
      number?: string;
      amount?: number;
      method?: string;
      courseId?: string;
      courseTitle?: string;
    };

    if (!method) {
      return NextResponse.json(
        { error: "طريقة الدفع مطلوبة" },
        { status: 400 },
      );
    }

    const methodConfig = getPaymentMethod(method);
    if (!methodConfig) {
      return NextResponse.json(
        { error: "طريقة الدفع غير مدعومة" },
        { status: 400 },
      );
    }
    if (!methodConfig.available) {
      return NextResponse.json(
        {
          error:
            methodConfig.unavailableNote ?? "طريقة الدفع غير متاحة حالياً",
        },
        { status: 400 },
      );
    }

    const isShakeOutFawry =
      methodConfig.provider === "shakeout" && methodConfig.id === "fawry";

    const isSha7nawyWallet =
      methodConfig.provider === "sha7nawy" &&
      SHA7NAWY_WALLET_METHODS.has(methodConfig.id);

    if (!isShakeOutFawry && !isSha7nawyWallet) {
      return NextResponse.json(
        {
          error:
            "طريقة الدفع غير مدعومة. فوري عبر Shake-Out فقط، والمحافظ المدعومة عبر Sha7nawy هي فودافون كاش واتصالات كاش وأورانج كاش فقط.",
        },
        { status: 400 },
      );
    }

    if (methodConfig.needsPhone && !number?.trim()) {
      return NextResponse.json(
        { error: "رقم المحفظة مطلوب" },
        { status: 400 },
      );
    }

    if (
      !amount ||
      amount < methodConfig.minAmount ||
      amount > methodConfig.maxAmount
    ) {
      return NextResponse.json(
        {
          error: `المبلغ مطلوب (الحد الأدنى ${methodConfig.minAmount} جنيه والحد الأقصى ${methodConfig.maxAmount.toLocaleString()} جنيه)`,
        },
        { status: 400 },
      );
    }

    const { baseAmount, taxAmount, totalAmount } = calculateAmountWithTax(
      amount,
      methodConfig.id,
    );
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://code-up.tech"
    ).replace(/\/$/, "");
    const purpose = courseTitle ? `شراء: ${courseTitle}` : "شحن رصيد المحفظة";
    const details = courseTitle
      ? `شراء: ${courseTitle} (${baseAmount} جنيه + ${methodConfig.feePercentage}% رسوم) = ${totalAmount} جنيه`
      : `شحن رصيد: ${baseAmount} جنيه (+ ${methodConfig.feePercentage}% رسوم = ${totalAmount} جنيه)`;

    if (isShakeOutFawry) {
      const result = await createShakeOutPayment({
        number: number || "",
        amount: totalAmount,
        method: methodConfig.id,
        client: session.id,
        customerName: session.name || "Student",
        customerEmail: session.email || undefined,
        details,
        webhook_url: `${appUrl}/api/payments/shakeout/webhook`,
      });
      if (!result.status) {
        return NextResponse.json(
          { error: result.message },
          { status: result.code || 400 },
        );
      }

      const reference = result.data?.reference
        ? String(result.data.reference)
        : null;
      const checkoutUrl =
        result.data?.payment_page_url || result.data?.url || null;
      if (reference) {
        await Promise.all([
          prisma.balanceTransaction.create({
            data: {
              userId: session.id,
              type: SHAKEOUT_PENDING_TYPE,
              amount: totalAmount,
              note: `${shakeOutRefNote(reference)}${checkoutUrl ? `|url:${checkoutUrl}` : ""}`,
            },
          }),
          persistProviderCheckout({
            userId: session.id,
            provider: "shakeout",
            reference,
            methodKey: methodConfig.id,
            totalPounds: totalAmount,
            subtotalPounds: baseAmount,
            taxPounds: taxAmount,
            checkoutUrl,
            purpose,
          }),
        ]);
      }
      return NextResponse.json({
        success: true,
        provider: "shakeout",
        reference: result.data?.reference,
        checkoutUrl:
          checkoutUrl ||
          (reference
            ? `https://dash.shake-out.com/invoice/${reference}`
            : null),
        method: methodConfig.id,
        methodLabel: methodConfig.label,
        baseAmount,
        taxAmount,
        totalAmount,
        instructions: result.message || methodConfig.shortNote,
        data: result.data,
      });
    }

    // Sha7nawy wallets only — no silent fallback to Shake-Out.
    const webhookUrl = `${appUrl}/api/payments/sha7nawy/webhook`;
    const result = await createSha7nawyPayment({
      number: number || "",
      amount: totalAmount,
      method: methodConfig.id,
      client: session.id,
      details,
      webhook_url: webhookUrl,
    });

    if (!result.status) {
      return NextResponse.json(
        { error: result.message },
        { status: result.code || 400 },
      );
    }

    const reference = result.data?.reference
      ? String(result.data.reference)
      : null;
    if (reference) {
      await Promise.all([
        prisma.balanceTransaction.create({
          data: {
            userId: session.id,
            type: SHA7NAWY_PENDING_TYPE,
            amount: totalAmount,
            note: sha7nawyRefNote(reference),
          },
        }),
        persistProviderCheckout({
          userId: session.id,
          provider: "sha7nawy",
          reference,
          methodKey: methodConfig.id,
          totalPounds: totalAmount,
          subtotalPounds: baseAmount,
          taxPounds: taxAmount,
          checkoutUrl: null,
          purpose,
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      provider: "sha7nawy",
      reference: result.data?.reference,
      method: methodConfig.id,
      methodLabel: methodConfig.label,
      baseAmount,
      taxAmount,
      totalAmount,
      instructions: result.message || methodConfig.shortNote,
      data: result.data,
    });
  } catch {
    console.error("[Create Payment API] Error");
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء بدء عملية الدفع" },
      { status: 500 },
    );
  }
}
