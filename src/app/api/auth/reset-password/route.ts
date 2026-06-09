import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEgyptPhone } from "@/lib/phone";
import {
  clearPhoneVerificationCookie,
} from "@/lib/auth";
import { verifyFirebaseIdToken } from "@/lib/firebase-auth-server";
import { isPhoneVerificationBypassed } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const { phone, firebaseToken, newPassword } = await req.json();

    if (!phone || !firebaseToken || !newPassword) {
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

    if (!isPhoneVerificationBypassed() || firebaseToken !== "bypass") {
      const firebaseUser = await verifyFirebaseIdToken(String(firebaseToken));
      if (!firebaseUser || !firebaseUser.phoneNumber) {
        return NextResponse.json(
          { error: "الكود غير صحيح أو انتهت صلاحيته" },
          { status: 400 }
        );
      }

      const normalizedFirebasePhone = normalizeEgyptPhone(firebaseUser.phoneNumber);
      if (normalizedFirebasePhone !== normalized) {
        return NextResponse.json(
          { error: "رقم الهاتف لا يتطابق مع الرقم الذي تم التحقق منه" },
          { status: 400 }
        );
      }
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
