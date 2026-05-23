import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const teachers = await prisma.user.findMany({
    where: { role: "teacher" },
    select: { id: true, name: true, email: true, createdAt: true, _count: { select: { courses: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ teachers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { name, password } = await req.json();
  if (!name || !password) {
    return NextResponse.json({ error: "الاسم وكلمة المرور مطلوبان" }, { status: 400 });
  }

  const email = `teacher_${Date.now()}@platform.local`;
  const hashed = await bcrypt.hash(password, 12);

  const teacher = await prisma.user.create({
    data: { name, email, password: hashed, role: "teacher" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return NextResponse.json({ teacher }, { status: 201 });
}
