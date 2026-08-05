import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/PaymentService";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => ({}));
    const { amount, method, number, client, details, customerName, customerEmail } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "المبلغ المطلوب غير صحيح" },
        { status: 400 }
      );
    }

    if (!method || typeof method !== "string") {
      return NextResponse.json(
        { success: false, error: "طريقة الدفع مطلوبة" },
        { status: 400 }
      );
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://code-up.tech").replace(/\/$/, "");

    const result = await PaymentService.createPayment({
      amount,
      method,
      number: number || session?.phone || undefined,
      client: client || session?.name || "Student",
      details: details || "حجز اشتراك على منصة Code-UP",
      customerName: customerName || session?.name || "Student User",
      customerEmail: customerEmail || session?.email || undefined,
      success_url: `${appUrl}/account?payment=success`,
      fail_url: `${appUrl}/account?payment=fail`,
      pending_url: `${appUrl}/account?payment=pending`,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || result.error || "تعذر بدء عملية الدفع" },
        { status: result.code || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      reference: result.reference,
      checkoutUrl: result.checkoutUrl,
      instructions: result.instructions,
      data: result.data,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[Unified Payment API Error]:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ غير متوقع أثناء معالجة طلب الدفع" },
      { status: 500 }
    );
  }
}
