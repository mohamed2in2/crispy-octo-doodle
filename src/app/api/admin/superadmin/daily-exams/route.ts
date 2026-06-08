import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  const exams = await prisma.dailyExam.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: {
        select: { questions: true, results: true }
      }
    }
  });

  return NextResponse.json({ exams });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const { title, educationalStage, date, timeLimitMinutes } = await req.json();

    if (!title || !educationalStage || !date) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const exam = await prisma.dailyExam.create({
      data: {
        title,
        educationalStage,
        date: new Date(date),
        timeLimitMinutes: timeLimitMinutes || 30,
        isActive: true,
      }
    });

    return NextResponse.json({ exam });
  } catch (error) {
    console.error("Error creating daily exam:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
