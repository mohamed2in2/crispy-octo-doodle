import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  clearPhoneVerificationCookie,
  setAuthCookie,
  signToken,
} from "@/lib/auth";
import { normalizeEgyptPhone } from "@/lib/phone";
import { isPhoneVerificationBypassed } from "@/lib/twilio";
import { verifyFirebaseIdToken } from "@/lib/firebase-auth-server";

function normalizeStage(value: string) {
  return value.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { name, password, phone, parentPhone, age, educationalStage, firebaseToken } = await req.json();

    if (!name || !password || !phone || !parentPhone || !age || !educationalStage || (!firebaseToken && !isPhoneVerificationBypassed())) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const normalizedPhone = normalizeEgyptPhone(String(phone));
    const normalizedParentPhone = normalizeEgyptPhone(String(parentPhone));

    if (normalizedPhone === normalizedParentPhone) {
      return NextResponse.json({ error: "رقم المتعلم لا يمكن أن يساوي رقم ولي الأمر" }, { status: 400 });
    }

    if (!isPhoneVerificationBypassed() || firebaseToken !== "bypass") {
      const firebaseUser = await verifyFirebaseIdToken(String(firebaseToken));
      if (!firebaseUser || !firebaseUser.phoneNumber) {
        return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
      }

      const normalizedFirebasePhone = normalizeEgyptPhone(firebaseUser.phoneNumber);
      if (normalizedFirebasePhone !== normalizedPhone) {
        return NextResponse.json({ error: "رقم الهاتف لا يتطابق مع الرقم الذي تم التحقق منه" }, { status: 400 });
      }
    }

    const generatedEmail = `${normalizedPhone.replace("+", "")}@students.code-up.tech`;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: generatedEmail }, { phone: normalizedPhone }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "هذا الرقم مسجل بالفعل" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const parsedAge = Number(age);
    if (!Number.isFinite(parsedAge) || parsedAge < 6 || parsedAge > 25) {
      return NextResponse.json({ error: "العمر غير صالح" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: generatedEmail,
        password: hashed,
        phone: normalizedPhone,
        parentPhone: normalizedParentPhone,
        age: parsedAge,
        educationalStage: normalizeStage(String(educationalStage)),
        role: "student",
        profileCompleted: true,
      },
    });

    const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    await setAuthCookie(token);
    await clearPhoneVerificationCookie();

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        age: user.age,
        educationalStage: user.educationalStage,
        profileCompleted: user.profileCompleted,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
