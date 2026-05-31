import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildBunnyEmbedUrl, isBunnyEmbedSigningEnabled } from "@/lib/bunny-stream";

// Verify an existing watch session (used when loading the watch page)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: videoId } = await params;
  const { searchParams } = new URL(req.url);
  const sessionToken = searchParams.get("token");

  if (!sessionToken) {
    return NextResponse.json({ error: "token مطلوب" }, { status: 400 });
  }

  const watchSession = await prisma.videoWatchSession.findUnique({
    where: { sessionToken },
    include: {
      video: {
        include: {
          folder: {
            select: {
              course: { select: { id: true, title: true, teacherId: true, maxWatchCount: true } },
            },
          },
        },
      },
    },
  });

  if (!watchSession) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  if (watchSession.studentId !== session.id) {
    return NextResponse.json({ error: "غير مصرح بهذه الجلسة" }, { status: 403 });
  }

  // Prevent the same student from passing a different student's token
  if (watchSession.videoId !== videoId) {
    return NextResponse.json({ error: "الفيديو لا يتطابق مع الجلسة" }, { status: 400 });
  }

  const now = new Date();
  const isExpired = watchSession.expiresAt < now || !!watchSession.endedAt;

  // Count total watch sessions created by this student in this course (including expired ones)
  // to reflect actual used watch slots.
  const usedWatchCount = await prisma.videoWatchSession.count({
    where: {
      studentId: session.id,
      usedWatchSlot: true,
      video: { folder: { courseId: watchSession.video.folder.course.id } },
    },
  });

  const course = watchSession.video.folder.course;

  return NextResponse.json({
    videoId,
    sessionToken,
    sessionId: watchSession.id,
    isExpired,
    startedAt: watchSession.startedAt.toISOString(),
    expiresAt: watchSession.expiresAt.toISOString(),
    remainingWatches: Math.max(0, course.maxWatchCount - usedWatchCount),
    totalWatches: course.maxWatchCount,
    usedWatches: usedWatchCount,
    video: {
      id: watchSession.video.id,
      title: watchSession.video.title,
      bunnyId: watchSession.video.bunnyId,
      courseId: course.id,
      courseTitle: course.title,
    },
  });
}

const WATCH_DURATION_HOURS = 4;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: videoId } = await params;
  const ipAddress = req.headers.get("x-forwarded-for") ?? null;

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      folder: {
        select: {
          courseId: true,
          course: {
            select: { id: true, title: true, teacherId: true, maxWatchCount: true },
          },
        },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
  }

  const course = video.folder.course;

  const now = new Date();

  const activeSession = await prisma.videoWatchSession.findFirst({
    where: {
      studentId: session.id,
      videoId,
      endedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
  });

  if (activeSession) {
    const activeUsedWatchCount = await prisma.videoWatchSession.count({
      where: { studentId: session.id, usedWatchSlot: true, video: { folder: { courseId: course.id } } },
    });

    const activeEmbedUrl = buildBunnyEmbedUrl(video.bunnyId, isBunnyEmbedSigningEnabled());

    return NextResponse.json({
      sessionToken: activeSession.sessionToken,
      sessionId: activeSession.id,
      expiresAt: activeSession.expiresAt.toISOString(),
      watchDurationHours: WATCH_DURATION_HOURS,
      remainingWatches: Math.max(0, course.maxWatchCount - activeUsedWatchCount),
      totalWatches: course.maxWatchCount,
      usedWatches: activeUsedWatchCount,
      embedUrl: activeEmbedUrl,
      reused: true,
    });
  }

  // Verify student has access to this course
  const hasAccess = await prisma.accessCode.findFirst({
    where: { courseId: course.id, studentId: session.id, isActive: true },
    select: { id: true },
  });

  if (!hasAccess) {
    return NextResponse.json({ error: "لا يوجد صلاحية للوصول لهذا الكورس" }, { status: 403 });
  }

  // Count how many watch slots this student has used in this course
  // (count sessions with usedWatchSlot = true)
  const usedWatchCount = await prisma.videoWatchSession.count({
    where: { studentId: session.id, usedWatchSlot: true, video: { folder: { courseId: course.id } } },
  });

  if (usedWatchCount >= course.maxWatchCount) {
    return NextResponse.json(
      {
        error: `لقد استنفدت جميع محاولات المشاهدة المتاحة لك في هذا الكورس (${course.maxWatchCount} مشاهدة)`,
        code: "NO_WATCHES_REMAINING",
      },
      { status: 403 }
    );
  }

  // Optionally expire any stale sessions for this student + video that haven't been ended
  await prisma.videoWatchSession.updateMany({
    where: {
      studentId: session.id,
      videoId,
      endedAt: null,
      expiresAt: { lt: now },
    },
    data: { endedAt: now },
  });

  // Create a new watch session token
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + WATCH_DURATION_HOURS * 60 * 60 * 1000);

  const watchSession = await prisma.videoWatchSession.create({
    data: {
      sessionToken,
      videoId,
      studentId: session.id,
      expiresAt,
      usedWatchSlot: true,
      ipAddress,
      userAgent: req.headers.get("user-agent") ?? null,
    },
  });

  // Build the signed Bunny URL (1-hour expiry so the CDN token expires within the session)
  const bunnySigned = isBunnyEmbedSigningEnabled();
  const embedUrl = buildBunnyEmbedUrl(video.bunnyId, bunnySigned);

  return NextResponse.json({
    sessionToken,
    sessionId: watchSession.id,
    expiresAt: expiresAt.toISOString(),
    watchDurationHours: WATCH_DURATION_HOURS,
    remainingWatches: course.maxWatchCount - usedWatchCount - 1,
    totalWatches: course.maxWatchCount,
    usedWatches: usedWatchCount + 1,
    embedUrl,
  });
}
