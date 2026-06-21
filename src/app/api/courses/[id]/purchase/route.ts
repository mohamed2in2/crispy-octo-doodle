import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  if (session.role === "teacher" || session.role === "staff") {
    return NextResponse.json({ error: "هذا الإجراء مخصص للمتعلمين فقط" }, { status: 403 });
  }

  const { id: courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, isPaid: true, price: true, discountPercent: true, discountExpiresAt: true },
  });
  if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

  // Calculate effective price
  const now = new Date();
  const discountActive =
    course.discountPercent != null &&
    course.discountPercent > 0 &&
    (course.discountExpiresAt == null || course.discountExpiresAt > now);

  const effectivePrice = (() => {
    if (!course.isPaid || !course.price) return 0;
    if (discountActive && course.discountPercent) {
      return +(course.price * (1 - course.discountPercent / 100)).toFixed(2);
    }
    return course.price;
  })();

  if (effectivePrice === 0) {
    return NextResponse.json({ error: "هذا الكورس مجاني — استخدم زر التسجيل المباشر" }, { status: 400 });
  }

  // Check already enrolled
  const existing = await prisma.accessCode.findFirst({
    where: { courseId, studentId: session.id },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "أنت مسجّل بالفعل في هذا الكورس" }, { status: 400 });

  // Check balance — treat NULL as 0 (new column on existing rows may be NULL in SQLite)
  const userRow = await prisma.user.findUnique({ where: { id: session.id }, select: { balance: true } });
  if (!userRow) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const currentBalance = userRow.balance ?? 0;  // NULL-safe
  if (currentBalance < effectivePrice) {
    return NextResponse.json({
      error: `رصيدك غير كافٍ (${currentBalance} جنيه). تحتاج ${effectivePrice} جنيه. أضف رصيداً باستخدام كود الشحن.`,
    }, { status: 400 });
  }

  const newBalance = +(currentBalance - effectivePrice).toFixed(2);
  const code = `PAY-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  // Atomic: set explicit new balance (not decrement — avoids NULL arithmetic in SQLite)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.id },
      data: { balance: newBalance },
    }),
    prisma.accessCode.create({
      data: { code, courseId, studentId: session.id, isActive: true, usedAt: now },
    }),
    prisma.balanceTransaction.create({
      data: {
        userId: session.id,
        type: "debit_course",
        amount: -effectivePrice,
        note: `شراء كورس: ${course.title}`,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    courseId,
    courseTitle: course.title,
    charged: effectivePrice,
    newBalance,
    message: `تم شراء «${course.title}» بنجاح! خُصم ${effectivePrice} جنيه — رصيدك الآن ${newBalance} جنيه.`,
  });
}
