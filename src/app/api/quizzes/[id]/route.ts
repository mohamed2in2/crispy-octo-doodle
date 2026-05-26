/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: quizId } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      folder: {
        select: {
          courseId: true,
          course: {
            select: { teacherId: true, title: true, subject: true },
          },
        },
      },
    },
  });

  if (!quiz) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const canAccessAsTeacher = session.role === "teacher" && quiz.folder.course.teacherId === session.id;
  const canAccessAsStudent = await prisma.accessCode.findFirst({
    where: { courseId: quiz.folder.courseId, studentId: session.id, isActive: true },
    select: { id: true },
  });

  if (!canAccessAsTeacher && !canAccessAsStudent) {
    return NextResponse.json({ error: "لا يوجد صلاحية للوصول" }, { status: 403 });
  }

  const isStudent = session.role === "student";
  const questions = isStudent
    ? quiz.questions.map((question: any) => {
        const { correctAnswer: _ca, ...q } = question;
        return q;
      })
    : quiz.questions;

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      timeLimitMinutes: (quiz as any).timeLimitMinutes,
      questions,
      folderId: quiz.folderId,
      courseId: quiz.folder.courseId,
      course: quiz.folder.course,
    },
    timeLimitMinutes: (quiz as any).timeLimitMinutes,
  });
}