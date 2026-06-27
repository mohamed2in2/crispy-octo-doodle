import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/homework/[id] — student fetches homework details (answers hidden) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: homeworkId } = await params;

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          question: true,
          imageUrl: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          order: true,
          // correctAnswer is intentionally omitted for students
        },
      },
    },
  });

  if (!homework) return NextResponse.json({ error: "الواجب غير موجود" }, { status: 404 });

  // Student: only published
  if (session.role === "student" && !homework.isPublished)
    return NextResponse.json({ error: "الواجب غير منشور" }, { status: 403 });

  // Strip sensitive fields for students
  const safe = {
    ...homework,
    expectedOutput: session.role === "student" ? null : homework.expectedOutput,
  };

  return NextResponse.json({ homework: safe });
}
