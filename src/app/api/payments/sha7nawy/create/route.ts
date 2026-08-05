import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSha7nawyPayment,
  calculateAmountWithTax,
  SHA7NAWY_PENDING_TYPE,
  sha7nawyRefNote,
} from "@/lib/sha7nawy";
import { getPaymentMethod } from "@/lib/payment-methods";

const SHA7NAWY_WALLET_METHODS = new Set(["vf_cash", "et_cash", "or_cash"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { number, amount, method, courseTitle } = body as {
      number?: string;
      amount?: number;
      method?: string;
      courseTitle?: string;
    };

    if (!method || !SHA7NAWY_WALLET_METHODS.has(method)) {
      return NextResponse.json(
        { error: "بوابة Sha7nawy مخصصة لمحافظ فودافون كاش واتصالات كاش وأورانج كاش فقط" },
        { status: 400 }
      );
    }

    const methodConfig = getPaymentMethod(method);
    if (!methodConfig || !methodConfig.available || methodConfig.provider !== "sha7nawy" || !methodConfig.needsPhone) {
      return NextResponse.json({ error: "طريقة المحفظة غير متاحة حالياً" }, { status: 400 });
    }

    if (!number?.trim()) {
      return NextResponse.json({ error: "رقم المحفظة مطلوب" }, { status: 400 });
    }

    if (!amount || amount < methodConfig.minAmount || amount > methodConfig.maxAmount) {
      return NextResponse.json(
        { error: `المبلغ يجب أن يكون بين ${methodConfig.minAmount} و ${methodConfig.maxAmount.toLocaleString()} جنيه` },
        { status: 400 }
      );
    }

    const { baseAmount, taxAmount, totalAmount } = calculateAmountWithTax(amount, methodConfig.id);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://code-up.tech").replace(/\/$/, "");
    const details = courseTitle
      ? `شراء: ${courseTitle} عبر ${methodConfig.label} (${baseAmount} جنيه + ${methodConfig.feePercentage}% رسوم) = ${totalAmount} جنيه`
      : `شحن رصيد عبر ${methodConfig.label}: ${baseAmount} جنيه (+ ${methodConfig.feePercentage}% رسوم = ${totalAmount} جنيه)`;

    const result = await createSha7nawyPayment({
      number: number.trim(),
      amount: totalAmount,
      method: methodConfig.id,
      client: session.id,
      details,
      webhook_url: `${appUrl}/api/payments/sha7nawy/webhook`,
    });

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: result.code || 400 });
    }

    const reference = result.data?.reference ? String(result.data.reference) : null;
    if (reference) {
      await prisma.balanceTransaction.create({
        data: {
          userId: session.id,
          type: SHA7NAWY_PENDING_TYPE,
          amount: totalAmount,
          note: sha7nawyRefNote(reference),
        },
      });
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
  } catch (error: unknown) {
    console.error("[Sha7nawy Create API] Error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء بدء عملية الدفع بالمحفظة" }, { status: 500 });
  }
}
