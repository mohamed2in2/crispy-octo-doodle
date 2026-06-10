import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStudentContext } from "@/lib/ai-context";
import { chatWithAI, type ChatMessage, type AIAction } from "@/lib/ai-assistant";

export async function POST(req: NextRequest) {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
    }

    // Build full student context
    const context = await buildStudentContext(session.id);

    // Get conversation history (last 10 messages)
    const history = await prisma.aIConversation.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, role: true, content: true },
    });
    const chatHistory: ChatMessage[] = history
      .reverse()
      .map((h) => ({
        role: h.role as ChatMessage["role"],
        content: h.content,
      }));

    // Build notifications from recently resolved requests
    const notifItems: string[] = [];
    const recentGrades = await prisma.gradeAdjustmentRequest.findMany({
      where: { studentId: session.id, status: { in: ["approved", "rejected"] }, reviewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      include: { quiz: { select: { title: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 3,
    });
    const recentTickets = await prisma.supportTicket.findMany({
      where: { studentId: session.id, status: { in: ["resolved", "closed"] }, updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    for (const r of recentGrades) {
      notifItems.push(`تعديل درجة "${r.quiz.title}": ${r.status === "approved" ? "مقبول ✅" : "مرفوض ❌"}${r.teacherNotes ? ` - ${r.teacherNotes}` : ""}`);
    }
    for (const t of recentTickets) {
      notifItems.push(`"${t.title}": ${t.status === "resolved" ? "تم الحل ✅" : "مغلق"}${t.resolution ? ` - ${t.resolution}` : ""}`);
    }
    const notifications = notifItems.length > 0 ? `تحديثات طلباتك:\n${notifItems.map((n) => `• ${n}`).join("\n")}` : undefined;

    // Save user message
    await prisma.aIConversation.create({
      data: {
        studentId: session.id,
        role: "user",
        content: message,
      },
    });

    // Get AI response
    const result = await chatWithAI(message, chatHistory, context, notifications);

    // Execute AI actions if any
    const executedActions: Array<{ type: string; status: string; id?: string; error?: string }> = [];
    for (const action of result.actions) {
      // Handle status check inline (option 5)
      if (action.type === "show_insights" && (action.payload as Record<string, unknown>)?.checkStatus) {
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
        let statusMsg = "📋 حالة طلباتي:\n\n";
        if (gradeReqs.length === 0 && ticketReqs.length === 0) {
          statusMsg += "مفيش طلبات لسه.\n";
        } else {
          if (gradeReqs.length > 0) {
            statusMsg += "✏️ طلبات تعديل درجة:\n";
            for (const r of gradeReqs) {
              const lbl = r.status === "approved" ? "مقبول ✅" : r.status === "rejected" ? "مرفوض ❌" : "قيد المراجعة ⏳";
              statusMsg += `• ${r.quiz.title}: ${lbl}${r.teacherNotes ? ` (${r.teacherNotes})` : ""}\n`;
            }
            statusMsg += "\n";
          }
          if (ticketReqs.length > 0) {
            statusMsg += "📢 الشكاوى:\n";
            for (const t of ticketReqs) {
              const lbl = t.status === "resolved" ? "تم الحل ✅" : t.status === "closed" ? "مغلق" : t.status === "escalated" ? "تم التصعيد ↑" : "مفتوح ⏳";
              statusMsg += `• ${t.title}: ${lbl}${t.resolution ? ` (${t.resolution})` : ""}\n`;
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

    // Save assistant response with actions
    await prisma.aIConversation.create({
      data: {
        studentId: session.id,
        role: "assistant",
        content: result.message,
        actions: executedActions.length > 0 ? JSON.stringify(executedActions) : null,
        context: JSON.stringify({
          source: result.source,
          courses: context.courses.length,
          weakAreas: context.weakAreas.length,
        }),
      },
    });

    // Prune old messages: keep only last 10
    const allMessages = await prisma.aIConversation.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (allMessages.length > 10) {
      const idsToDelete = allMessages.slice(10).map((m) => m.id);
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
    console.error("AI chat error:", err instanceof Error ? err.stack : err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const history = await prisma.aIConversation.findMany({
      where: { studentId: session.id },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        role: true,
        content: true,
        actions: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages: history });
  } catch (err) {
    console.error("AI chat history error:", err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

async function executeAction(
  studentId: string,
  action: AIAction
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

        // Get current quiz result
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
          return { type: action.type, status: "failed", error: "لم يتم حل هذا الكويز" };
        }

        // Build AI analysis with chat context for staff
        let aiAnalysis = "تم إنشاء الطلب بواسطة المساعد الذكي بناءً على شكوى المتعلم";
        if (p.evidence) {
          try {
            const ctx = JSON.parse(p.evidence) as { chatHistory?: string; studentInfo?: string };
            const parts = [aiAnalysis];
            if (ctx.studentInfo) parts.push(`\n\n📋 بيانات المتعلم:\n${ctx.studentInfo}`);
            if (ctx.chatHistory) parts.push(`\n\n💬 سجل المحادثة:\n${ctx.chatHistory}`);
            aiAnalysis = parts.join("");
          } catch { /* keep default */ }
        }

        const req = await prisma.gradeAdjustmentRequest.create({
          data: {
            studentId,
            quizId: p.quizId,
            courseId: result.quiz.folder.courseId,
            requestedBy: "student",
            currentScore: result.score,
            requestedScore: p.requestedScore ?? null,
            reason: p.reason,
            aiAnalysis,
            evidence: p.evidence ?? null,
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
          chatHistory?: string;
          studentInfo?: string;
        };
        if (!p?.title || !p?.description) {
          return { type: action.type, status: "failed", error: "بيانات ناقصة" };
        }

        // Build AI response with chat context for staff
        let aiResponse: string | null = null;
        if (p.chatHistory || p.studentInfo) {
          const parts: string[] = [];
          if (p.studentInfo) parts.push(`📋 بيانات المتعلم:\n${p.studentInfo}`);
          if (p.chatHistory) parts.push(`💬 سجل المحادثة:\n${p.chatHistory}`);
          aiResponse = parts.join("\n\n");
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
            aiResponse,
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

        const course = await prisma.course.findUnique({
          where: { id: p.courseId },
          select: { teacherId: true },
        });
        if (!course) {
          return { type: action.type, status: "failed", error: "الكورس غير موجود" };
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
  } catch (err) {
    console.error("Action execution error:", err);
    return {
      type: action.type,
      status: "failed",
      error: err instanceof Error ? err.message : "خطأ غير معروف",
    };
  }
}
