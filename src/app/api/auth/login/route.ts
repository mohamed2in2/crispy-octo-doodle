import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";
import { normalizeEgyptPhone } from "@/lib/phone";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "رقم الهاتف وكلمة المرور مطلوبان" }, { status: 400 });
    }

    const normalizedPhone = normalizeEgyptPhone(String(phone));

    const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
    if (!user) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    

    if (user.role !== "student") {
      return NextResponse.json({ error: "استخدم لوحة الإدارة لتسجيل الدخول" }, { status: 403 });
    }

    const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    await setAuthCookie(token);

    // Points Logic: Award daily login points
    const { awardDailyLoginPoints } = await import("@/lib/points");
    await awardDailyLoginPoints(user.id);

    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
