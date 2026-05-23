/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;

  const access = await prisma.accessCode.findFirst({
    where: { courseId: id, studentId: session.id },
  });
  if (!access) {
    return NextResponse.json(
      { error: "لا يوجد صلاحية للوصول. فعّل كود الكورس أو تواصل مع المدرس." },
      { status: 403 }
    );
  }

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true } },
      folders: {
        orderBy: { order: "asc" },
        include: {
          videos: {
            orderBy: { order: "asc" },
            include: {
              progress: {
                where: { studentId: session.id },
                select: { watched: true, watchedAt: true },
              },
            },
          },
          quizzes: {
            select: ({
              id: true,
              title: true,
              timeLimitMinutes: true,
              questions: { orderBy: { order: "asc" } },
            } as any),
          },
        },
      },
    },
  });

  if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

  const safeCourse = {
    ...course,
    folders: course.folders.map((folder) => ({
      ...folder,
      videos: folder.videos.map(({ bunnyId: _bunnyId, ...video }) => video),
      quizzes: folder.quizzes.map((quiz) => {
        const q = quiz as unknown as {
          id: string;
          title: string;
          timeLimitMinutes: number;
          questions?: Array<{ correctAnswer?: string; [key: string]: unknown }>;
        };
        return {
          id: q.id,
          title: q.title,
          timeLimitMinutes: q.timeLimitMinutes,
          questions: (q.questions ?? []).map(({ correctAnswer: _ca, ...question }) => question),
        };
      }),
    })),
  };

  return NextResponse.json({ course: safeCourse });
}
