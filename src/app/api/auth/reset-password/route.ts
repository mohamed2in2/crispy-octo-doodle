import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEgyptPhone } from "@/lib/phone";
import {
  verifyPhoneVerificationCookie,
  clearPhoneVerificationCookie,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone, code, newPassword } = await req.json();

    if (!phone || !code || !newPassword) {
      return NextResponse.json(
        { error: "جميع الحقول مطلوبة" },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const normalized = normalizeEgyptPhone(String(phone));

    const valid = await verifyPhoneVerificationCookie(normalized, String(code));
    if (!valid) {
      return NextResponse.json(
        { error: "الكود غير صحيح أو انتهت صلاحيته" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalized, role: "student" },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "لا يوجد حساب مرتبط بهذا الرقم" },
        { status: 404 }
      );
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await clearPhoneVerificationCookie();

    return NextResponse.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تغيير كلمة المرور" },
      { status: 500 }
    );
  }
}
