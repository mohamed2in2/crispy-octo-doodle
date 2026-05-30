import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEgyptPhone } from "@/lib/phone";
import {
  createPhoneVerificationChallenge,
  setPhoneVerificationCookie,
} from "@/lib/auth";
import {
  sendVerificationSms,
  generateVerificationCode,
  isPhoneVerificationBypassed,
} from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const normalized = normalizeEgyptPhone(String(phone));

    const user = await prisma.user.findFirst({
      where: { phone: normalized, role: "student" },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "لا يوجد حساب طالب مرتبط بهذا الرقم" },
        { status: 404 }
      );
    }

    const code = generateVerificationCode();

    let devCode: string | undefined;
    try {
      const result = await sendVerificationSms(normalized, code);
      if (result.method === "dev") devCode = result.code;
    } catch (err) {
      console.error("forgot-password SMS error:", err);
      return NextResponse.json(
        { error: "تعذر إرسال رسالة التحقق، حاول مرة أخرى" },
        { status: 500 }
      );
    }

    const challengeToken = await createPhoneVerificationChallenge(
      normalized,
      code,
      "sms"
    );
    const response = NextResponse.json({
      message: "تم إرسال كود التحقق إلى هاتفك",
      ...(isPhoneVerificationBypassed() && devCode ? { devCode } : {}),
    });

    await setPhoneVerificationCookie(challengeToken);
    return response;
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
