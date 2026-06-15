import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePublishAt } from "@/lib/publish";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await params;
  const folders = await prisma.folder.findMany({
    where: { courseId: id },
    include: { videos: { orderBy: { order: "asc" } }, quizzes: { include: { questions: { orderBy: { order: "asc" } } } }, materials: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id: courseId } = await params;
  const { name, publishAt } = (await req.json()) as { name?: string; publishAt?: string | null };
  if (!name) return NextResponse.json({ error: "اسم المحاضرة مطلوب" }, { status: 400 });
  const count = await prisma.folder.count({ where: { courseId } });
  const folder = await prisma.folder.create({
    data: { name, courseId, order: count, publishAt: parsePublishAt(publishAt) ?? null },
  });
  return NextResponse.json({ folder }, { status: 201 });
}
