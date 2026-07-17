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
    
    // Check Course Access Code
    const accessCode = await prisma.accessCode.findUnique({ where: { code: normalizedCode } });
    if (accessCode) {
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
        type: "course",
        courseId: accessCode.courseId,
        courseTitle: course?.title,
        message: "تم تفعيل الكود وإضافة الكورس إلى مكتبتك",
      });
    }

    // Check Plan Access Code
    const planCode = await prisma.planAccessCode.findUnique({ where: { code: normalizedCode } });
    if (planCode) {
      if (planCode.usedById) {
        return NextResponse.json({ error: "هذا الكود مستخدم بالفعل" }, { status: 400 });
      }
      if (!planCode.isActive) {
        return NextResponse.json({ error: "هذا الكود غير فعال" }, { status: 400 });
      }

      const student = await prisma.user.findUnique({
        where: { id: session.id },
        select: { educationalStage: true }
      });

      const plan = await prisma.plan.findUnique({ 
        where: { id: planCode.planId }, 
        select: { id: true, title: true, durationDays: true, educationalStage: true } 
      });

      if (!plan) {
        return NextResponse.json({ error: "الخطة غير موجودة" }, { status: 404 });
      }

      // Stage check (Gap 11)
      if (student?.educationalStage && plan.educationalStage && student.educationalStage !== plan.educationalStage) {
        return NextResponse.json({ error: "هذا الكود مخصص لمرحلة دراسية مختلفة" }, { status: 400 });
      }

      const alreadyEnrolled = await prisma.planEnrollment.findUnique({
        where: { planId_studentId: { planId: planCode.planId, studentId: session.id } },
      });

      if (alreadyEnrolled) {
        const now = new Date();
        const isExpired = alreadyEnrolled.expiresAt < now;
        
        if (isExpired) {
          // Re-enroll / Renew expired plan (Gap 25)
          await prisma.planAccessCode.update({
            where: { id: planCode.id },
            data: { usedById: session.id, usedAt: now, isActive: false },
          });

          const durationDays = plan.durationDays ?? 365;
          await prisma.planEnrollment.update({
            where: { id: alreadyEnrolled.id },
            data: {
              unlockedAt: now,
              expiresAt: new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
              pricePaid: 0,
            }
          });

          return NextResponse.json({
            success: true,
            type: "plan",
            planId: planCode.planId,
            planTitle: plan.title,
            message: "تم تجديد اشتراكك في هذه الخطة بنجاح وتفعيل المحتوى",
          });
        }

        return NextResponse.json({
          success: true,
          planId: planCode.planId,
          message: "أنت مسجل بالفعل في هذه الخطة",
        });
      }

      // Mark code as used
      await prisma.planAccessCode.update({
        where: { id: planCode.id },
        data: { usedById: session.id, usedAt: new Date(), isActive: false },
      });

      const durationDays = plan.durationDays ?? 365;
      
      await prisma.planEnrollment.create({
        data: {
          planId: planCode.planId,
          studentId: session.id,
          pricePaid: 0,
          expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        }
      });

      return NextResponse.json({
        success: true,
        type: "plan",
        planId: planCode.planId,
        planTitle: plan.title,
        message: "تم تفعيل الكود وإضافة الخطة إلى مكتبتك",
      });
    }

    return NextResponse.json({ error: "الكود غير صحيح" }, { status: 404 });
  } catch (error) {
    console.error("[codes] error:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
