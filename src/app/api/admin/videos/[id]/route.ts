import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: videoId } = await params;
  const body = await req.json() as { maxWatchesPerUser?: number; durationMinutes?: number; isFree?: boolean; publishAt?: string | null; title?: string };

  const video = await prisma.video.findFirst({
    where: { id: videoId, folder: { course: { teacherId: session.id } } },
  });
  if (!video) return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });

  const data: Record<string, number | boolean> = {};

  if (typeof body.maxWatchesPerUser === "number" && body.maxWatchesPerUser >= 1) {
    data.maxWatchesPerUser = Math.floor(body.maxWatchesPerUser);
  }
  if (typeof body.durationMinutes === "number" && body.durationMinutes >= 0) {
    data.durationMinutes = Math.floor(body.durationMinutes);
  }
  if (typeof body.isFree === "boolean") {
    data.isFree = body.isFree;
  }
  if (body.publishAt !== undefined) {
    (data as any).publishAt = body.publishAt ? new Date(body.publishAt) : null;
  }
  if (body.title && typeof body.title === "string" && body.title.trim()) {
    (data as any).title = body.title.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
  }

  const updated = await prisma.video.update({ where: { id: videoId }, data });
  return NextResponse.json({ video: updated });
}
