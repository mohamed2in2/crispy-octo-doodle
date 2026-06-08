/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: quizId } = await params;
  const body = await req.json();
  const answers = (body?.answers ?? {}) as Record<string, string>;
  const startedAt = body?.startedAt ? new Date(body.startedAt) : null;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      folder: { select: { courseId: true, course: { select: { teacherId: true } } } },
    },
  });

  if (!quiz) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const canAccessAsTeacher = session.role === "teacher" && quiz.folder.course.teacherId === session.id;
  const canAccessAsStudent = await prisma.accessCode.findFirst({
    where: {
      courseId: quiz.folder.courseId,
      studentId: session.id,
      isActive: true,
    },
    select: { id: true },
  });

  if (!canAccessAsTeacher && !canAccessAsStudent) {
    return NextResponse.json({ error: "لا يوجد صلاحية للوصول" }, { status: 403 });
  }

  const totalQ = quiz.questions.length;
  if (!totalQ) return NextResponse.json({ error: "الاختبار بدون أسئلة" }, { status: 400 });

  // Block retake unless teacher allowed it
  const existingResult = await prisma.quizResult.findUnique({
    where: { studentId_quizId: { studentId: session.id, quizId } },
  });
  if (existingResult && !existingResult.allowRetake) {
    return NextResponse.json(
      { error: "لقد أجبت على هذا الاختبار بالفعل. تواصل مع المدرس للسماح بإعادة المحاولة." },
      { status: 409 }
    );
  }

  const limitMinutes = (quiz as any).timeLimitMinutes ?? 30;
  if (startedAt && !Number.isNaN(startedAt.getTime())) {
    const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    if (elapsedSeconds > limitMinutes * 60) {
      return NextResponse.json({ error: "انتهى وقت الاختبار" }, { status: 400 });
    }
  }

  const breakdown = quiz.questions.map((question: any) => {
    const yourAnswer = answers[question.id] ?? null;
    const isCorrect = yourAnswer === question.correctAnswer;
    return {
      questionId: question.id,
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      yourAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
    };
  });

  const correct = breakdown.filter((item: any) => item.isCorrect).length;
  const score = Number(((correct / totalQ) * 100).toFixed(2));
  const passed = score >= 50;

  const result = await prisma.quizResult.upsert({
    where: { studentId_quizId: { studentId: session.id, quizId } },
    update: { score, totalQ, completedAt: new Date(), allowRetake: false },
    create: { studentId: session.id, quizId, score, totalQ },
  });

  // Points Logic
  if (session.role === "student") {
    const { addPoints, POINTS } = await import("@/lib/points");
    let pointsEarned = 0;
    
    if (!existingResult && passed) {
      pointsEarned += POINTS.FIRST_TRY_BONUS;
    }
    if (score === 100) {
      pointsEarned += POINTS.EXAM_FULL_SCORE;
    }
    
    if (pointsEarned > 0) {
      await addPoints(session.id, pointsEarned);
    }
  }

  return NextResponse.json({
    result,
    correct,
    totalQ,
    score,
    passed,
    breakdown,
    quizTitle: quiz.title,
    courseId: quiz.folder.courseId,
  });
}
