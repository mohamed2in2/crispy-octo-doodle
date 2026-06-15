import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Resume-playback position for a (student, video) pair. Stored on Progress so it
 * survives the 4-hour watch-session boundary — see the schema note on Progress.
 *
 * GET  → { seconds } the last saved position (0 if none).
 * POST → { seconds } upserts the position. This is metadata only: it never
 *        consumes a watch slot and never marks the video complete.
 */

const MAX_POSITION = 24 * 60 * 60; // 24h cap — guards against bogus values

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ seconds: 0 });

  const { id: videoId } = await params;
  const progress = await prisma.progress.findUnique({
    where: { studentId_videoId: { studentId: session.id, videoId } },
    select: { lastPositionSeconds: true, watched: true },
  });

  return NextResponse.json({
    seconds: progress?.lastPositionSeconds ?? 0,
    watched: progress?.watched ?? false,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: videoId } = await params;
  const body = (await req.json().catch(() => ({}))) as { seconds?: number };
  const raw = Number(body.seconds);
  if (!Number.isFinite(raw) || raw < 0) {
    return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
  }
  const seconds = Math.min(Math.round(raw), MAX_POSITION);

  // Only persist for a video that actually exists (avoids orphan rows).
  const exists = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });

  await prisma.progress.upsert({
    where: { studentId_videoId: { studentId: session.id, videoId } },
    update: { lastPositionSeconds: seconds, positionUpdatedAt: new Date() },
    create: { studentId: session.id, videoId, lastPositionSeconds: seconds, positionUpdatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, seconds });
}
