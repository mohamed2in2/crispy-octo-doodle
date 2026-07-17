import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: videoId } = await params;

  const watchSession = await prisma.videoWatchSession.findFirst({
    where: { videoId, studentId: session.id },
    orderBy: { startedAt: "desc" },
  });
  if (!watchSession) {
    return NextResponse.json({ error: "لا توجد جلسة مشاهدة لهذا الفيديو" }, { status: 403 });
  }

  await prisma.progress.upsert({
    where: { studentId_videoId: { studentId: session.id, videoId } },
    create: { studentId: session.id, videoId, watched: true, watchedAt: new Date() },
    update: { watched: true, watchedAt: new Date() },
  });

  // Track plan lesson progress
  const now = new Date();
  const planSources = await prisma.planLessonSource.findMany({
    where: { videoId },
    include: {
      planLesson: {
        select: {
          id: true,
          planId: true,
        }
      }
    }
  });

  for (const source of planSources) {
    const enrollment = await prisma.planEnrollment.findFirst({
      where: {
        studentId: session.id,
        planId: source.planLesson.planId,
        expiresAt: { gt: now }
      },
      select: { id: true }
    });

    if (enrollment) {
      await prisma.planLessonProgress.upsert({
        where: {
          enrollmentId_planLessonId: {
            enrollmentId: enrollment.id,
            planLessonId: source.planLessonId
          }
        },
        create: {
          enrollmentId: enrollment.id,
          planLessonId: source.planLessonId,
          chosenSourceId: source.id,
          watched: true
        },
        update: {
          chosenSourceId: source.id,
          watched: true
        }
      });
    }
  }

  return NextResponse.json({ success: true });
}
