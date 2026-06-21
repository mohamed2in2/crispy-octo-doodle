import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET — teacher's own homeworks */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const homeworks = await prisma.homework.findMany({
    where: { teacherId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true, submissions: true } },
      questions: { orderBy: { order: "asc" }, select: { id: true, order: true, question: true, imageUrl: true, optionA: true, optionB: true, optionC: true, optionD: true, correctAnswer: true } },
    },
  });

  return NextResponse.json({ homeworks });
}

/** POST — create a homework */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json() as {
    title: string;
    description?: string;
    type: "link" | "exam";
    linkUrl?: string;
    courseId?: string;
    dueAt?: string;
    timeLimitMinutes?: number;
    isPublished?: boolean;
    questions?: { question: string; imageUrl?: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string }[];
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
  if (body.type === "link" && !body.linkUrl?.trim()) return NextResponse.json({ error: "الرابط مطلوب" }, { status: 400 });
  if (body.type === "exam" && (!body.questions || body.questions.length === 0)) {
    return NextResponse.json({ error: "يجب إضافة سؤال واحد على الأقل" }, { status: 400 });
  }

  // Validate image URLs — only allow http/https external URLs (no uploads)
  if (body.type === "exam" && body.questions) {
    for (const q of body.questions) {
      if (q.imageUrl && !/^https?:\/\//i.test(q.imageUrl)) {
        return NextResponse.json({ error: "رابط الصورة يجب أن يبدأ بـ https://" }, { status: 400 });
      }
    }
  }

  const homework = await prisma.homework.create({
    data: {
      teacherId:       session.id,
      title:           body.title.trim(),
      description:     body.description?.trim() ?? null,
      type:            body.type,
      linkUrl:         body.linkUrl?.trim() ?? null,
      courseId:        body.courseId ?? null,
      dueAt:           body.dueAt ? new Date(body.dueAt) : null,
      timeLimitMinutes: body.timeLimitMinutes ?? 30,
      isPublished:     body.isPublished ?? false,
      questions: body.type === "exam" && body.questions ? {
        create: body.questions.map((q, i) => ({
          question:      q.question.trim(),
          imageUrl:      q.imageUrl?.trim() || null,
          optionA:       q.optionA.trim(),
          optionB:       q.optionB.trim(),
          optionC:       q.optionC.trim(),
          optionD:       q.optionD.trim(),
          correctAnswer: q.correctAnswer,
          order:         i,
        })),
      } : undefined,
    },
    include: { questions: true },
  });

  return NextResponse.json({ homework }, { status: 201 });
}
