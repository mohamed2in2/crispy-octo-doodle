import { NextRequest, NextResponse } from "next/server";
import { getSession, getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveEmbedUrl } from "@/lib/video-provider";
import { isScheduledLocked, unlockAtISO } from "@/lib/publish";

// Verify an existing watch session (used when loading the watch page on refresh)
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
              publishAt: true,
              course: { select: { id: true, title: true, teacherId: true } },
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
  if (watchSession.videoId !== videoId) {
    return NextResponse.json({ error: "الفيديو لا يتطابق مع الجلسة" }, { status: 400 });
  }

  const now = new Date();
  const isExpired = watchSession.expiresAt < now || !!watchSession.endedAt;

  // Per-video watch quota
  const usedWatchCount = await prisma.videoWatchSession.count({
    where: { studentId: session.id, videoId, usedWatchSlot: true },
  });

  const video = watchSession.video;
  const course = video.folder.course;
  const total = video.maxWatchesPerUser;

  return NextResponse.json({
    videoId,
    sessionToken,
    sessionId: watchSession.id,
    isExpired,
    startedAt: watchSession.startedAt.toISOString(),
    expiresAt: watchSession.expiresAt.toISOString(),
    remainingWatches: Math.max(0, total - usedWatchCount),
    totalWatches: total,
    usedWatches: usedWatchCount,
    video: {
      id: video.id,
      title: video.title,
      vdoCipherId: video.vdoCipherId,
      videoProvider: video.videoProvider,
      providerVideoId: video.providerVideoId,
      courseId: course.id,
      courseTitle: course.title,
    },
  });
}

const WATCH_DURATION_HOURS = 4;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Session may be null for anonymous viewers of a free/demo video. Use the
  // role-agnostic session so admins/superadmins can preview too.
  const session = await getSession();

  const { id: videoId } = await params;
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      folder: {
        select: {
          courseId: true,
          publishAt: true,
          course: { select: { id: true, title: true, teacherId: true } },
        },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
  }

  const course = video.folder.course;
  const now = new Date();

  // ── Scheduled unlock: a not-yet-published video can't start a session ──────
  if (isScheduledLocked(video.folder.publishAt, video.publishAt, now.getTime())) {
    return NextResponse.json(
      {
        error: "هذه المحاضرة لم تُفتح بعد. ستتاح في موعدها المحدد.",
        code: "SCHEDULED",
        unlockAt: unlockAtISO(video.folder.publishAt, video.publishAt),
      },
      { status: 403 }
    );
  }

  // ── FREE / DEMO video: bypass enrollment + quota, no session row consumed ──
  if (video.isFree) {
    const embedResult = await resolveEmbedUrl(video);
    const expiresAt = new Date(now.getTime() + WATCH_DURATION_HOURS * 60 * 60 * 1000);
    return NextResponse.json({
      sessionToken: "free",
      expiresAt: expiresAt.toISOString(),
      watchDurationHours: WATCH_DURATION_HOURS,
      remainingWatches: null,
      totalWatches: null,
      usedWatches: 0,
      embedUrl: embedResult.embedUrl,
      provider: embedResult.provider,
      free: true,
    });
  }

  // ── PAID video from here on — requires a logged-in student ──
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // Teacher/staff have no place in the student watch flow.
  if (session.role === "teacher" || session.role === "staff") {
    return NextResponse.json(
      { error: "صفحة مشاهدة الكورس مخصّصة للطلاب فقط.", code: "ROLE_NOT_ALLOWED" },
      { status: 403 }
    );
  }

  // Admin / superadmin: preview playback — no enrollment, no quota, no slot used.
  if (session.role === "admin" || session.role === "superadmin") {
    const embedResult = await resolveEmbedUrl(video);
    const expiresAt = new Date(now.getTime() + WATCH_DURATION_HOURS * 60 * 60 * 1000);
    return NextResponse.json({
      sessionToken: "preview",
      expiresAt: expiresAt.toISOString(),
      watchDurationHours: WATCH_DURATION_HOURS,
      remainingWatches: null,
      totalWatches: null,
      usedWatches: 0,
      embedUrl: embedResult.embedUrl,
      provider: embedResult.provider,
      preview: true,
    });
  }

  // Device lock: a device-bound token whose device was reset/removed can't play.
  // (Legacy tokens issued before the feature have no deviceId — allowed.)
  if (session.deviceId) {
    const device = await prisma.device.findUnique({
      where: { userId_deviceId: { userId: session.id, deviceId: session.deviceId } },
    });
    if (!device) {
      return NextResponse.json(
        { error: "تم إلغاء تفعيل هذا الجهاز. يرجى تسجيل الدخول من جديد.", code: "DEVICE_REVOKED" },
        { status: 403 }
      );
    }
  }

  // Reuse an existing active session for this student + video
  const activeSession = await prisma.videoWatchSession.findFirst({
    where: { studentId: session.id, videoId, endedAt: null, expiresAt: { gt: now } },
    orderBy: { startedAt: "desc" },
  });

  if (activeSession) {
    const activeUsedWatchCount = await prisma.videoWatchSession.count({
      where: { studentId: session.id, videoId, usedWatchSlot: true },
    });

    const embedResult = await resolveEmbedUrl(video);

    return NextResponse.json({
      sessionToken: activeSession.sessionToken,
      sessionId: activeSession.id,
      expiresAt: activeSession.expiresAt.toISOString(),
      watchDurationHours: WATCH_DURATION_HOURS,
      remainingWatches: Math.max(0, video.maxWatchesPerUser - activeUsedWatchCount),
      totalWatches: video.maxWatchesPerUser,
      usedWatches: activeUsedWatchCount,
      embedUrl: embedResult.embedUrl,
      provider: embedResult.provider,
      reused: true,
    });
  }

  // Verify enrollment
  const hasAccess = await prisma.accessCode.findFirst({
    where: { courseId: course.id, studentId: session.id, isActive: true },
    select: { id: true },
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "لا يوجد صلاحية للوصول لهذا الكورس" }, { status: 403 });
  }

  // Per-video watch quota
  const usedWatchCount = await prisma.videoWatchSession.count({
    where: { studentId: session.id, videoId, usedWatchSlot: true },
  });
  if (usedWatchCount >= video.maxWatchesPerUser) {
    return NextResponse.json(
      {
        error: `لقد استنفدت جميع محاولات المشاهدة لهذا الفيديو (${video.maxWatchesPerUser} مشاهدة)`,
        code: "NO_WATCHES_REMAINING",
      },
      { status: 403 }
    );
  }

  // Expire stale sessions
  await prisma.videoWatchSession.updateMany({
    where: { studentId: session.id, videoId, endedAt: null, expiresAt: { lt: now } },
    data: { endedAt: now },
  });

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

  const embedResult = await resolveEmbedUrl(video);

  return NextResponse.json({
    sessionToken,
    sessionId: watchSession.id,
    expiresAt: expiresAt.toISOString(),
    watchDurationHours: WATCH_DURATION_HOURS,
    remainingWatches: video.maxWatchesPerUser - usedWatchCount - 1,
    totalWatches: video.maxWatchesPerUser,
    usedWatches: usedWatchCount + 1,
    embedUrl: embedResult.embedUrl,
    provider: embedResult.provider,
  });
}
