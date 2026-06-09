import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEgyptPhone } from "@/lib/phone";
import { isPhoneVerificationBypassed } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "رقم الطالب مطلوب" }, { status: 400 });
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeEgyptPhone(phone);
    } catch {
      return NextResponse.json({ error: "رقم الهاتف غير صالح" }, { status: 400 });
    }

    const generatedEmail = `${normalizedPhone.replace("+", "")}@students.code-up.tech`;

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: generatedEmail }, { phone: normalizedPhone }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "هذا الرقم مسجل بالفعل" }, { status: 409 });
    }

    const bypass = isPhoneVerificationBypassed();

    return NextResponse.json({ success: true, bypass });
  } catch (error) {
    console.error("Phone verification code route error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}