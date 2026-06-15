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

  return NextResponse.json({ success: true });
}
