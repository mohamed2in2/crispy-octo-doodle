import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeEgyptPhone } from "@/lib/phone";
import { isPhoneVerificationBypassed } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    }

    const normalized = normalizeEgyptPhone(String(phone));

    const user = await prisma.user.findFirst({
      where: { phone: normalized, role: "student" },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "لا يوجد حساب طالب مرتبط بهذا الرقم" },
        { status: 404 }
      );
    }

    const bypass = isPhoneVerificationBypassed();

    return NextResponse.json({
      success: true,
      bypass,
    });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}
