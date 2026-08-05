import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createShakeOutPayment,
  SHAKEOUT_PENDING_TYPE,
  shakeOutRefNote,
} from "@/lib/shakeout";
import { calculateAmountWithTax } from "@/lib/sha7nawy";
import { getPaymentMethod } from "@/lib/payment-methods";

const FAWRY_METHOD_ID = "fawry";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { amount, method, courseTitle } = body as {
      amount?: number;
      method?: string;
      courseTitle?: string;
    };

    if (method !== FAWRY_METHOD_ID) {
      return NextResponse.json({ error: "بوابة Shake-Out مخصصة للدفع عبر فوري فقط" }, { status: 400 });
    }

    const methodConfig = getPaymentMethod(FAWRY_METHOD_ID);
    if (!methodConfig || !methodConfig.available || methodConfig.provider !== "shakeout") {
      return NextResponse.json({ error: "الدفع عبر فوري غير متاح حالياً" }, { status: 400 });
    }

    if (!amount || amount < methodConfig.minAmount || amount > methodConfig.maxAmount) {
      return NextResponse.json(
        { error: `المبلغ يجب أن يكون بين ${methodConfig.minAmount} و ${methodConfig.maxAmount.toLocaleString()} جنيه` },
        { status: 400 }
      );
    }

    const { baseAmount, taxAmount, totalAmount } = calculateAmountWithTax(amount, FAWRY_METHOD_ID);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://code-up.tech").replace(/\/$/, "");
    const webhookUrl = `${appUrl}/api/payments/shakeout/webhook`;
    const details = courseTitle
      ? `شراء: ${courseTitle} عبر فوري (${baseAmount} جنيه + ${methodConfig.feePercentage}% رسوم) = ${totalAmount} جنيه`
      : `شحن رصيد عبر فوري: ${baseAmount} جنيه (+ ${methodConfig.feePercentage}% رسوم = ${totalAmount} جنيه)`;

    const result = await createShakeOutPayment({
      number: "",
      amount: totalAmount,
      method: FAWRY_METHOD_ID,
      client: session.id,
      details,
      webhook_url: webhookUrl,
    });

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: result.code || 400 });
    }

    const reference = result.data?.reference ? String(result.data.reference) : null;
    const checkoutUrl = result.data?.payment_page_url || result.data?.url || null;
    if (reference) {
      await prisma.balanceTransaction.create({
        data: {
          userId: session.id,
          type: SHAKEOUT_PENDING_TYPE,
          amount: totalAmount,
          note: `${shakeOutRefNote(reference)}${checkoutUrl ? `|url:${checkoutUrl}` : ""}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      provider: "shakeout",
      reference: result.data?.reference,
      checkoutUrl,
      method: FAWRY_METHOD_ID,
      methodLabel: methodConfig.label,
      baseAmount,
      taxAmount,
      totalAmount,
      instructions: result.message || methodConfig.shortNote,
      data: result.data,
    });
  } catch (error: unknown) {
    console.error("[Shake-Out Create API] Error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء بدء الدفع عبر فوري" }, { status: 500 });
  }
}
