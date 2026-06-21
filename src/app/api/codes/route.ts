import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ROLE_MESSAGES: Record<string, string> = {
  teacher: "حساب المعلم لا يمكنه تفعيل أكواد الكورسات — هذا الإجراء مخصص للمتعلمين فقط.",
  staff:   "حساب الموظف لا يمكنه تفعيل أكواد الكورسات — هذا الإجراء مخصص للمتعلمين فقط.",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    // Teacher and staff are blocked — admins and superadmins are allowed through
    if (session.role === "teacher" || session.role === "staff") {
      return NextResponse.json(
        { error: ROLE_MESSAGES[session.role] },
        { status: 403 }
      );
    }

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
  } catch (error) {
    console.error("[codes] error:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
