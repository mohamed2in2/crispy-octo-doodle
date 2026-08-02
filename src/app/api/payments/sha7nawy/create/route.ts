import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSha7nawyPayment, Sha7nawyWalletMethod, WALLET_INSTRUCTIONS, WALLET_METHOD_LABELS } from "@/lib/sha7nawy";

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

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://code-up.tech").replace(/\/$/, "");
    const webhookUrl = `${appUrl}/api/payments/sha7nawy/webhook`;

    const details = courseTitle
      ? `شراء كورس: ${courseTitle} (طالب: ${session.name || session.id})`
      : `شحن رصيد: ${amount} جنيه (طالب: ${session.name || session.id})`;

    const result = await createSha7nawyPayment({
      number,
      amount,
      method,
      client: session.id,
      details,
      webhook_url: webhookUrl,
    });

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: result.code || 400 });
    }

    return NextResponse.json({
      success: true,
      reference: result.data?.reference,
      method: method,
      methodLabel: WALLET_METHOD_LABELS[method],
      amount: amount,
      instructions: result.message || WALLET_INSTRUCTIONS[method],
      data: result.data,
    });
  } catch (error: any) {
    console.error("[Sha7nawy Create Payment API] Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع أثناء بدء عملية الدفع" }, { status: 500 });
  }
}
