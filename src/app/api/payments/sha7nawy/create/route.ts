import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSha7nawyPayment,
  Sha7nawyWalletMethod,
  WALLET_INSTRUCTIONS,
  WALLET_METHOD_LABELS,
  calculateAmountWithTax,
  SHA7NAWY_PENDING_TYPE,
  sha7nawyRefNote,
} from "@/lib/sha7nawy";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { number, amount, method, courseId, courseTitle } = body as {
      number?: string;
      amount?: number;
      method?: Sha7nawyWalletMethod;
      courseId?: string;
      courseTitle?: string;
    };

    if (!number?.trim()) {
      return NextResponse.json({ error: "رقم المحفظة مطلوب" }, { status: 400 });
    }

    if (!amount || amount < 5) {
      return NextResponse.json({ error: "المبلغ مطلوب (الحد الأدنى 5 جنيه)" }, { status: 400 });
    }

    if (!method || !["vf_cash", "or_cash", "et_cash"].includes(method)) {
      return NextResponse.json({ error: "نوع المحفظة غير مدعوم" }, { status: 400 });
    }

    if (method === "or_cash") {
      return NextResponse.json(
        { error: "محفظة أورنج كاش تحت الصيانة والتطوير حالياً لتقديم خدمة أفضل. يرجى اختيار فودافون كاش أو اتصالات كاش لإتمام العملية دون قلق." },
        { status: 400 }
      );
    }

    // Calculate 2% tax / service fee
    const { baseAmount, taxAmount, totalAmount } = calculateAmountWithTax(amount);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://code-up.tech").replace(/\/$/, "");
    const webhookUrl = `${appUrl}/api/payments/sha7nawy/webhook`;

    const details = courseTitle
      ? `شراء: ${courseTitle} (${baseAmount} جنيه + 2% رسوم) = ${totalAmount} جنيه`
      : `شحن رصيد: ${baseAmount} جنيه (+ 2% رسوم = ${totalAmount} جنيه)`;

    const result = await createSha7nawyPayment({
      number,
      amount: totalAmount,
      method,
      client: session.id,
      details,
      webhook_url: webhookUrl,
    });

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: result.code || 400 });
    }

    // Record a pending ledger entry so the webhook can verify the transaction
    // against server-side state instead of trusting client-controlled fields.
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
      reference: result.data?.reference,
      method: method,
      methodLabel: WALLET_METHOD_LABELS[method],
      baseAmount,
      taxAmount,
      totalAmount,
      instructions: result.message || WALLET_INSTRUCTIONS[method],
      data: result.data,
    });
  } catch (error: any) {
    console.error("[Create Payment API] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء بدء عملية الدفع" }, { status: 500 });
  }
}
