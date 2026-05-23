import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { role, name, password } = await req.json();

    if (role === "superadmin") {
      const master = process.env.SUPERADMIN_MASTER_PASSWORD;
      if (!master) {
        return NextResponse.json({ error: "الخادم غير مهيأ بشكل صحيح" }, { status: 500 });
      }
      if (password !== master) {
        return NextResponse.json({ error: "كلمة المرور الرئيسية غير صحيحة" }, { status: 401 });
      }
      const token = await signToken({ id: "superadmin", email: "superadmin@system", name: "المشرف العام", role: "superadmin" });
      await setAuthCookie(token);
      return NextResponse.json({ user: { id: "superadmin", name: "المشرف العام", role: "superadmin" } });
    }

    if (role === "teacher") {
      if (!name || !password) {
        return NextResponse.json({ error: "الاسم وكلمة المرور مطلوبان" }, { status: 400 });
      }
      const teacher = await prisma.user.findFirst({ where: { name, role: "teacher" } });
      if (!teacher) {
        return NextResponse.json({ error: "المدرس غير موجود" }, { status: 404 });
      }
      if (!teacher.password) {
        return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, teacher.password);
      if (!valid) {
        return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
      }
      const token = await signToken({ id: teacher.id, email: teacher.email, name: teacher.name, role: "teacher" });
      await setAuthCookie(token);
      return NextResponse.json({ user: { id: teacher.id, name: teacher.name, role: "teacher" } });
    }

    return NextResponse.json({ error: "دور غير صحيح" }, { status: 400 });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
