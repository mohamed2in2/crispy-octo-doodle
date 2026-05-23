import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, age, educationalStage } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone: phone || null,
        age: age ? parseInt(age) : null,
        educationalStage: educationalStage || null,
        role: "student",
      },
    });

    const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    await setAuthCookie(token);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
