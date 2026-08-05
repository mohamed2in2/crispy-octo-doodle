import { NextRequest, NextResponse } from "next/server";
import { getStudentSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStudentContext } from "@/lib/ai-context";
import { chatWithAI, type ChatMessage, type AIAction } from "@/lib/ai-assistant";
import {
  buildSafeLearnerContext,
  normalizePrompt,
} from "@/lib/ai-egress";

/**
 * Chat messages are plain user text only.
 * - No secret words, magic commands, developer modes, or telemetry disclosure.
 * - History deletion is available only via DELETE /api/ai/chat.
 * - External AI calls use the privacy egress boundary inside chatWithAI.
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getStudentSession()) ?? (await getSession());
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawMessage = typeof body?.message === "string" ? body.message : "";
    const message = normalizePrompt(rawMessage);
    if (!message) {
      return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
    }

    let context;
    try {
      context = await buildStudentContext(session.id);
    } catch (ctxErr) {
      console.error("[chat/route] buildStudentContext failed");
      return NextResponse.json({
        message: "يرجى المحاولة مرة أخرى لاحقاً.",
        actions: [],
        source: "error",
      });
    }

    const history = await prisma.aIConversation.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, role: true, content: true },
    });
    const chatHistory: ChatMessage[] = history
      .reverse()
      .map((h) => ({
        role: h.role as ChatMessage["role"],
        content: h.content,
      }));

    // Local-only status hints (never sent to external providers as raw ticket text).
    const notifItems: string[] = [];
    const recentGrades = await prisma.gradeAdjustmentRequest.findMany({
      where: {
        studentId: session.id,
        status: { in: ["approved", "rejected"] },
        reviewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { quiz: { select: { title: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 3,
    });
    const recentTickets = await prisma.supportTicket.findMany({
      where: {
        studentId: session.id,
        status: { in: ["resolved", "closed"] },
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    for (const r of recentGrades) {
      notifItems.push(
        `تعديل درجة: ${r.status === "approved" ? "مقبول" : "مرفوض"}`,
      );
    }
    for (const t of recentTickets) {
      notifItems.push(
        `طلب دعم: ${t.status === "resolved" ? "تم الحل" : "مغلق"}`,
      );
    }
    const notifications =
      notifItems.length > 0
        ? `تحديثات طلباتك:\n${notifItems.map((n) => `• ${n}`).join("\n")}`
        : undefined;

    await prisma.aIConversation.create({
      data: {
        studentId: session.id,
        role: "user",
        content: message,
      },
    });

    // Prefer the privacy-preserving local assistant path.
    // AIEngine is skipped by default because it receives studentId and rich context.
    let result;
    try {
      result = await chatWithAI(message, chatHistory, context, notifications);
    } catch {
      console.error("[chat/route] chatWithAI failed");
      result = {
        message: "عذراً، حدث خطأ مؤقت. حاول مرة أخرى.\n\n[م:menu]",
        actions: [] as AIAction[],
        source: "fallback" as const,
      };
    }

    const executedActions: Array<{
      type: string;
      status: string;
      id?: string;
      error?: string;
    }> = [];

    for (const action of result.actions) {
      if (
        action.type === "show_insights" &&
        (action.payload as Record<string, unknown>)?.checkStatus
      ) {
        const gradeReqs = await prisma.gradeAdjustmentRequest.findMany({
          where: { studentId: session.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { quiz: { select: { title: true } } },
        });
        const ticketReqs = await prisma.supportTicket.findMany({
          where: { studentId: session.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        let statusMsg = "حالة طلباتي:\n\n";
        if (gradeReqs.length === 0 && ticketReqs.length === 0) {
          statusMsg += "مفيش طلبات لسه.\n";
        } else {
          if (gradeReqs.length > 0) {
            statusMsg += "طلبات تعديل درجة:\n";
            for (const r of gradeReqs) {
              const lbl =
                r.status === "approved"
                  ? "مقبول"
                  : r.status === "rejected"
                    ? "مرفوض"
                    : "قيد المراجعة";
              statusMsg += `• ${r.quiz.title}: ${lbl}\n`;
            }
            statusMsg += "\n";
          }
          if (ticketReqs.length > 0) {
            statusMsg += "الشكاوى:\n";
            for (const t of ticketReqs) {
              const lbl =
                t.status === "resolved"
                  ? "تم الحل"
                  : t.status === "closed"
                    ? "مغلق"
                    : t.status === "escalated"
                      ? "تم التصعيد"
                      : "مفتوح";
              statusMsg += `• ${t.title}: ${lbl}\n`;
            }
          }
        }
        statusMsg += "\nاكتب 0 للرجوع\n\n[م:5]";
        result.message = statusMsg;
        executedActions.push({ type: "show_insights", status: "ok" });
        continue;
      }
      const exec = await executeAction(session.id, action);
      executedActions.push(exec);
    }

    const safe = buildSafeLearnerContext({
      educationalStage: context.profile.educationalStage,
      courseCount: context.overallStats.totalCourses,
      averageScore: context.overallStats.averageScore,
      quizzesTaken: context.overallStats.totalQuizzesTaken,
      videosWatched: context.overallStats.totalVideosWatched,
      subjects: context.courses.map((c) => c.subject),
      weakTopics: context.weakAreas.map((w) => w.topic),
    });

    await prisma.aIConversation.create({
      data: {
        studentId: session.id,
        role: "assistant",
        content: result.message,
        actions:
          executedActions.length > 0 ? JSON.stringify(executedActions) : null,
        context: JSON.stringify({
          source: result.source,
          courses: safe.courseCount,
          weakAreas: safe.weakTopics.length,
        }),
      },
    });

    const allMessages = await prisma.aIConversation.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (allMessages.length > 15) {
      const idsToDelete = allMessages.slice(15).map((m) => m.id);
      await prisma.aIConversation.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    return NextResponse.json({
      message: result.message,
      actions: executedActions,
      source: result.source,
    });
  } catch (err) {
    console.error("[chat/route] unhandled error");
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = (await getStudentSession()) ?? (await getSession());
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const history = await prisma.aIConversation.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: "asc" },
      take: 15,
      select: {
        id: true,
        role: true,
        content: true,
        actions: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages: history });
  } catch {
    console.error("[chat/route] history error");
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

/** Authenticated deletion only — never via chat message text. */
export async function DELETE() {
  try {
    const session = (await getStudentSession()) ?? (await getSession());
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    await prisma.aIConversation.deleteMany({
      where: { studentId: session.id },
    });

    try {
      const { MemoryManager } = await import("@/ai/memory/MemoryManager");
      MemoryManager.getInstance().clearSession(session.id);
    } catch {
      // Memory manager is optional; DB wipe is the source of truth.
    }

    return NextResponse.json({
      success: true,
      message: "تم مسح المحادثة وحذف السجل بالكامل",
    });
  } catch {
    console.error("[chat/route] delete error");
    return NextResponse.json(
      { error: "حدث خطأ أثناء مسح المحادثة" },
      { status: 500 },
    );
  }
}

async function executeAction(
  studentId: string,
  action: AIAction,
): Promise<{ type: string; status: string; id?: string; error?: string }> {
  try {
    switch (action.type) {
      case "create_grade_request": {
        const p = action.payload as {
          quizId: string;
          reason: string;
          requestedScore?: number;
          evidence?: string;
        };
        if (!p?.quizId || !p?.reason) {
          return { type: action.type, status: "failed", error: "بيانات ناقصة" };
        }

        const result = await prisma.quizResult.findFirst({
          where: { quizId: p.quizId, studentId },
          include: {
            quiz: {
              include: {
                folder: { select: { courseId: true } },
              },
            },
          },
        });

        if (!result) {
          return {
            type: action.type,
            status: "failed",
            error: "لم يتم حل هذا الكويز",
          };
        }

        const req = await prisma.gradeAdjustmentRequest.create({
          data: {
            studentId,
            quizId: p.quizId,
            courseId: result.quiz.folder?.courseId ?? "plan",
            requestedBy: "student",
            currentScore: result.score,
            requestedScore: p.requestedScore ?? null,
            reason: p.reason,
            aiAnalysis:
              "تم إنشاء الطلب بواسطة المساعد الذكي بناءً على شكوى المتعلم",
            evidence: null,
            status: "pending",
          },
        });

        return { type: action.type, status: "created", id: req.id };
      }

      case "create_ticket": {
        const p = action.payload as {
          title: string;
          description: string;
          type: string;
          priority?: string;
          courseId?: string;
        };
        if (!p?.title || !p?.description) {
          return { type: action.type, status: "failed", error: "بيانات ناقصة" };
        }

        if (p.courseId) {
          const { checkCourseEnrollment } = await import("@/lib/authorization");
          const isEnrolled = await checkCourseEnrollment(studentId, p.courseId);
          if (!isEnrolled) {
            return {
              type: action.type,
              status: "failed",
              error: "غير مسجل في هذا الكورس",
            };
          }
        }

        const ticket = await prisma.supportTicket.create({
          data: {
            studentId,
            courseId: p.courseId ?? null,
            title: p.title,
            description: p.description,
            type: p.type || "complaint",
            priority: p.priority || "normal",
            aiHandled: true,
            aiResponse: null,
            status: "open",
          },
        });

        return { type: action.type, status: "created", id: ticket.id };
      }

      case "submit_feedback": {
        const p = action.payload as {
          courseId: string;
          type: string;
          content: string;
          rating?: number;
        };
        if (!p?.courseId || !p?.content) {
          return { type: action.type, status: "failed", error: "بيانات ناقصة" };
        }

        const { checkCourseEnrollment } = await import("@/lib/authorization");
        const isEnrolled = await checkCourseEnrollment(studentId, p.courseId);
        if (!isEnrolled) {
          return {
            type: action.type,
            status: "failed",
            error: "غير مسجل في هذا الكورس",
          };
        }

        const course = await prisma.course.findUnique({
          where: { id: p.courseId },
          select: { teacherId: true },
        });
        if (!course) {
          return {
            type: action.type,
            status: "failed",
            error: "الكورس غير موجود",
          };
        }

        const fb = await prisma.studentFeedback.create({
          data: {
            studentId,
            courseId: p.courseId,
            teacherId: course.teacherId,
            type: p.type || "other",
            content: p.content,
            rating: p.rating ?? null,
            aiAnalyzed: true,
          },
        });

        return { type: action.type, status: "created", id: fb.id };
      }

      case "navigate":
      case "show_insights":
      case "none":
        return { type: action.type, status: "ok" };

      default:
        return { type: "unknown", status: "ignored" };
    }
  } catch {
    console.error("[chat/route] action execution error");
    return {
      type: action.type,
      status: "failed",
      error: "خطأ غير معروف",
    };
  }
}
