import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStudentContext } from "@/lib/ai-context";
import { generateInsights } from "@/lib/ai-assistant";

type InsightCandidate = { type: string; category: string; title: string; description: string; confidence: number };
const ALLOWED_TYPES = new Set(["weak_area", "strength", "recommendation", "risk_alert"]);
const MAX_INSIGHTS = 5;

function hasInvalidPercentage(text: string) {
  return (text.match(/\d+(?=%)/g) ?? []).some((value) => Number(value) > 100);
}

/** Predictions are study recommendations, never an assessment of a student. */
function sanitizeInsights(candidates: InsightCandidate[]): InsightCandidate[] {
  return candidates
    .filter((candidate) => ALLOWED_TYPES.has(candidate.type))
    .map((candidate) => ({
      type: candidate.type,
      category: candidate.category.slice(0, 80) || "general",
      title: candidate.title.replace(/\s+/g, " ").trim().slice(0, 140),
      description: candidate.description.replace(/\s+/g, " ").trim().slice(0, 600),
      confidence: Math.max(0, Math.min(0.95, Number(candidate.confidence) || 0)),
    }))
    .filter((candidate) => candidate.title.length >= 3 && candidate.description.length >= 3)
    .filter((candidate) => !hasInvalidPercentage(`${candidate.title} ${candidate.description}`))
    .slice(0, MAX_INSIGHTS);
}

export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const existing = await prisma.aIStudentInsight.findMany({ where: { studentId: session.id }, orderBy: { createdAt: "desc" }, take: 10 });
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hasBadInsight = existing.some((insight) => hasInvalidPercentage(`${insight.title} ${insight.description}`));
    if (existing.length > 0 && existing[0].createdAt >= oneDayAgo && !hasBadInsight) {
      return NextResponse.json({ insights: existing, refreshed: false });
    }

    const context = await buildStudentContext(session.id);
    // External providers receive learning aggregates only: no direct identifier,
    // contact data, age, private feedback, or prior free-text insight content.
    const deidentifiedContext = {
      ...context,
      profile: { ...context.profile, name: "متعلم", email: "", age: null, phone: null },
      recentFeedback: [],
      aiInsights: [],
    };
    const fresh = sanitizeInsights(await generateInsights(deidentifiedContext));
    if (hasBadInsight) await prisma.aIStudentInsight.deleteMany({ where: { studentId: session.id } });

    const created = await Promise.all(fresh.map((insight) => prisma.aIStudentInsight.create({
      data: {
        studentId: session.id,
        type: insight.type,
        category: insight.category,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        dataSnapshot: JSON.stringify({
          averageScore: context.overallStats.averageScore,
          courses: context.overallStats.totalCourses,
          weakAreas: context.weakAreas.length,
          generatedFrom: "first-party-learning-data",
        }),
      },
    })));

    return NextResponse.json({ insights: created, refreshed: true });
  } catch (error) {
    console.error("Insights GET error:", error);
    return NextResponse.json({ error: "تعذر تحديث توصيات المذاكرة الآن" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const body = (await req.json()) as { id?: string; isRead?: boolean; isActioned?: boolean; actionTaken?: string };
    if (!body.id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

    const insight = await prisma.aIStudentInsight.findFirst({ where: { id: body.id, studentId: session.id } });
    if (!insight) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    const updated = await prisma.aIStudentInsight.update({
      where: { id: insight.id },
      data: {
        ...(typeof body.isRead === "boolean" ? { isRead: body.isRead } : {}),
        ...(typeof body.isActioned === "boolean" ? { isActioned: body.isActioned } : {}),
        ...(typeof body.actionTaken === "string" ? { actionTaken: body.actionTaken.trim().slice(0, 500) } : {}),
      },
    });
    return NextResponse.json({ insight: updated });
  } catch (error) {
    console.error("Insights POST error:", error);
    return NextResponse.json({ error: "تعذر تحديث التوصية" }, { status: 500 });
  }
}
