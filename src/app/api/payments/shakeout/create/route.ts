import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { persistProviderCheckout } from "@/lib/financial/payment-persistence";
import { getPaymentMethod } from "@/lib/payment-methods";
import { prisma } from "@/lib/prisma";
import { calculateAmountWithTax } from "@/lib/sha7nawy";
import {
  createShakeOutPayment,
  SHAKEOUT_PENDING_TYPE,
  shakeOutRefNote,
} from "@/lib/shakeout";

/** Shake-Out endpoint is Fawry-only. No wallet fallback. */
const SHAKEOUT_ALLOWED = new Set(["fawry"]);

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
      courseTitle?: string;
    };

    if (!amount || amount < 5) {
      return NextResponse.json(
        { error: "المبلغ مطلوب (الحد الأدنى 5 جنيه)" },
        { status: 400 },
      );
    }

    const selectedMethod = method || "fawry";
    if (!SHAKEOUT_ALLOWED.has(selectedMethod)) {
      return NextResponse.json(
        {
          error:
            "Shake-Out يدعم فوري فقط. المحافظ الإلكترونية تُعالج عبر Sha7nawy.",
        },
        { status: 400 },
      );
    }

    const methodConfig = getPaymentMethod(selectedMethod);
    if (!methodConfig || !methodConfig.available) {
      return NextResponse.json(
        {
          error:
            methodConfig?.unavailableNote ||
            "طريقة الدفع غير متاحة حالياً",
        },
        { status: 400 },
      );
    }

    if (methodConfig.provider !== "shakeout") {
      return NextResponse.json(
        { error: "طريقة الدفع لا تنتمي لمزود Shake-Out" },
        { status: 400 },
      );
    }

    const { baseAmount, taxAmount, totalAmount } = calculateAmountWithTax(
      amount,
      selectedMethod,
    );
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://code-up.tech"
    ).replace(/\/$/, "");
    const webhookUrl = `${appUrl}/api/payments/shakeout/webhook`;
    const details = courseTitle
      ? `شراء: ${courseTitle} عبر Shake-Out (${baseAmount} جنيه + ${methodConfig.feePercentage}% رسوم) = ${totalAmount} جنيه`
      : `شحن رصيد: ${baseAmount} جنيه عبر Shake-Out (+ ${methodConfig.feePercentage}% رسوم = ${totalAmount} جنيه)`;

    const result = await createShakeOutPayment({
      number: number || "",
      amount: totalAmount,
      method: selectedMethod,
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
    const checkoutUrl =
      result.data?.payment_page_url || result.data?.url || null;
    if (reference) {
      const noteText = `${shakeOutRefNote(reference)}${checkoutUrl ? `|url:${checkoutUrl}` : ""}`;
      await prisma.balanceTransaction.create({
        data: {
          userId: session.id,
          type: SHAKEOUT_PENDING_TYPE,
          amount: totalAmount,
          note: noteText,
        },
      });
      await persistProviderCheckout({
        userId: session.id,
        provider: "shakeout",
        reference,
        methodKey: selectedMethod,
        totalPounds: totalAmount,
        subtotalPounds: baseAmount,
        taxPounds: taxAmount,
        checkoutUrl,
        purpose: courseTitle ? `شراء: ${courseTitle}` : "شحن رصيد المحفظة",
      });
    }

    const finalCheckoutUrl =
      checkoutUrl ||
      (reference
        ? `https://dash.shake-out.com/invoice/${reference}`
        : null);

    return NextResponse.json({
      success: true,
      provider: "shakeout",
      reference: result.data?.reference,
      checkoutUrl: finalCheckoutUrl,
      method: selectedMethod,
      methodLabel: methodConfig.label,
      baseAmount,
      taxAmount,
      totalAmount,
      instructions:
        result.message ||
        methodConfig.shortNote ||
        "تم إنشاء الفاتورة بنجاح. جارٍ توجيهك للسداد...",
      data: result.data,
    });
  } catch {
    console.error("[Shake-Out Create API] Error");
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء بدء الدفع عبر Shake-Out" },
      { status: 500 },
    );
  }
}
