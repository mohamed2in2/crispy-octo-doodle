import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateIQReport } from "@/lib/ai-caller";
import type { IQReportInput } from "@/lib/ai-caller";

const SUBJECT_AR: Record<string, string> = {
  math:       "الرياضيات",
  physics:    "الفيزياء",
  chemistry:  "الكيمياء",
  biology:    "الأحياء",
  history:    "التاريخ",
  geography:  "الجغرافيا",
  languages:  "اللغات",
  coding:     "البرمجة",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    // Allow unauthenticated for guest play (generate report without student name)
    const studentName = session?.name ?? "الطالب";

    const body = await req.json() as Partial<IQReportInput> & { subject?: string };

    if (!body.subject || !body.totalQuestions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const input: IQReportInput = {
      studentName,
      subject:        body.subject,
      subjectAr:      SUBJECT_AR[body.subject] ?? body.subject,
      correctAnswers: body.correctAnswers ?? 0,
      totalQuestions: body.totalQuestions,
      avgTimeSec:     body.avgTimeSec ?? 10,
      maxLevel:       body.maxLevel ?? 5,
      maxStreak:      body.maxStreak ?? 0,
      difficulty:     body.difficulty ?? "medium",
      skills:         body.skills ?? {},
    };

    const report = await generateIQReport(input);
    return NextResponse.json({ report });
  } catch (err) {
    console.error("[IQ Report API]", err);
    // Return a static fallback so the UI never breaks
    return NextResponse.json({
      report: "أداء جيد! استمر في التدرب وسترى تحسناً ملحوظاً في مستواك. كل جلسة تمرين تبني مهاراتك خطوة بخطوة.",
    });
  }
}
