import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSessionWithRetry } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getStudentSessionWithRetry();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "الكود مطلوب" }, { status: 400 });

  const normalizedCode = String(code).trim().toUpperCase();
  const accessCode = await prisma.accessCode.findUnique({ where: { code: normalizedCode } });
  if (!accessCode) return NextResponse.json({ error: "الكود غير صحيح" }, { status: 404 });
  if (accessCode.studentId) {
    return NextResponse.json({ error: "هذا الكود مستخدم بالفعل" }, { status: 400 });
  }
  if (!accessCode.isActive) {
    return NextResponse.json({ error: "هذا الكود غير فعال" }, { status: 400 });
  }

  const alreadyEnrolled = await prisma.accessCode.findFirst({
    where: { courseId: accessCode.courseId, studentId: session.id },
  });
  if (alreadyEnrolled) {
    return NextResponse.json({
      success: true,
      courseId: accessCode.courseId,
      message: "أنت مسجل بالفعل في هذا الكورس",
    });
  }

  await prisma.accessCode.update({
    where: { id: accessCode.id },
    data: { studentId: session.id, usedAt: new Date(), isActive: true },
  });

  const course = await prisma.course.findUnique({
    where: { id: accessCode.courseId },
    select: { id: true, title: true },
  });

  return NextResponse.json({
    success: true,
    courseId: accessCode.courseId,
    courseTitle: course?.title,
    message: "تم تفعيل الكود وإضافة الكورس إلى مكتبتك",
  });
}
