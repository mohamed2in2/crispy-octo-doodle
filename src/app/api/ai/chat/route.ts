import { NextRequest, NextResponse } from "next/server";
import { getStudentSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStudentContext } from "@/lib/ai-context";
import { chatWithAI, type ChatMessage, type AIAction } from "@/lib/ai-assistant";

export async function POST(req: NextRequest) {
  try {
    // Accept students AND admins/owners (they need to test the chat too)
    const session = await getStudentSession() ?? await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 });
    }

    const trimmedMsg = message.trim();
    const cleanMsg = trimmedMsg.toLowerCase();

    // 1. Ahmed123M / Admin123 command check for live AI statistics & model telemetry
    if (cleanMsg === "ahmed123m" || cleanMsg === "admin123") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayConversations = await prisma.aIConversation.findMany({
        where: { createdAt: { gte: startOfToday } },
        select: { studentId: true },
      });
      const uniqueUsersToday = new Set(todayConversations.map((c) => c.studentId)).size;
      const totalMessagesToday = todayConversations.length;

      const { CostManager } = await import("@/ai/admin/cost_analytics/CostManager");
      const { Telemetry } = await import("@/ai/telemetry/Telemetry");
      const { ConfigManager } = await import("@/ai/config/AIConfig");

      const costMgr = CostManager.getInstance();
      const telemetry = Telemetry.getInstance();
      const config = ConfigManager.getInstance().getConfig();

      const metrics = telemetry.getMetrics();
      const providerCosts = costMgr.getCostByProvider();
      const totalCostUsd = costMgr.getTotalCostUsd();

      let activeModel = config.primaryProvider;
      if (config.primaryProvider === "digitalocean") {
        activeModel = "Code-UP Platform Assistant (DigitalOcean Premium)";
      } else if (config.primaryProvider === "gemini") {
        activeModel = "Google Gemini Pool (Primary)";
      } else if (config.primaryProvider === "deepseek" || config.primaryProvider === "deepseek_v4_flash") {
        activeModel = "DeepSeek V4 Flash";
      }

      const geminiRequests = metrics.requestsByProvider["gemini"] || 0;
      const geminiCost = providerCosts["gemini"] || 0;

      const doRequests = metrics.requestsByProvider["digitalocean"] || 0;
      const doCost = providerCosts["digitalocean"] || 0;

      const deepseekRequests = (metrics.requestsByProvider["deepseek_v4_flash"] || 0) + (metrics.requestsByProvider["deepseek"] || 0);
      const deepseekCost = (providerCosts["deepseek_v4_flash"] || 0) + (providerCosts["deepseek"] || 0);

      const mockRequests = metrics.requestsByProvider["mock"] || 0;

      const statsText = `📊 **تقرير الإحصائيات الفوري للنظام (Ahmed123M Live Stats)**\n\n` +
        `🤖 **النموذج المتحدث الحالي (Talking Model)**: \`${activeModel}\`\n` +
        `🔄 **سلسلة التراجع التلقائي (Fallback Chain)**: \`DigitalOcean ➔ Gemini Pool ➔ Mock ➔ DeepSeek V4 Flash\`\n` +
        `👥 **عدد مستخدمي الذكاء الاصطناعي اليوم (Users Today)**: ${uniqueUsersToday} مستخدم\n` +
        `💬 **إجمالي رسائل المحادثة اليوم (Messages Today)**: ${totalMessagesToday} رسالة\n\n` +
        `━━━━━━━━━━━━━━━━\n\n` +
        `💸 **تكاليف واستخدام المزودين (Today's Provider Costs & Usage)**:\n` +
        `• 💰 **إجمالي التكلفة اليومية الكلية**: \`$${totalCostUsd.toFixed(6)} USD\`\n` +
        `• ⚡ **DigitalOcean Premium**: ${doRequests} طلبات | تكلفة: \`$${doCost.toFixed(6)} USD\`\n` +
        `• 🟢 **Google Gemini Pool**: ${geminiRequests} طلبات | تكلفة: \`$${geminiCost.toFixed(6)} USD\`\n` +
        `• 🟡 **Mock Provider (Local)**: ${mockRequests} طلبات | تكلفة: \`$0.00 USD\` (مجاني محلي)\n` +
        `• 🔵 **DeepSeek V4 Flash**: ${deepseekRequests} طلبات | تكلفة: \`$${deepseekCost.toFixed(6)} USD\` (احتياطي دائم)\n\n` +
        `━━━━━━━━━━━━━━━━\n\n` +
        `🛡️ **حالة الميزانية والأمان (Budget & Safety Limits)**:\n` +
        `• 📊 **الاستهلاك مقابل الميزانية**: \`$${totalCostUsd.toFixed(4)} / $50.00 Max USD\`\n` +
        `• ⚡ **إجمالي التوكنز المستهلكة**: ${metrics.totalTokensUsed} tokens\n` +
        `• ⏳ **متوسط سرعة الاستجابة**: ${Math.round(metrics.averageLatencyMs)} ms\n` +
        `• ⚙️ **حد حفظ المحادثة الأقصى**: 15 رسالة فقط`;

      return NextResponse.json({
        message: statsText,
        actions: [],
        source: "admin_stats",
      });
    }

    // 2. Secret password to choose which model to talk to: AhmedToldMeSotalkelse
    if (cleanMsg.includes("ahmedtoldmesotalkelse")) {
      const { ConfigManager } = await import("@/ai/config/AIConfig");
      const configMgr = ConfigManager.getInstance();

      const arg = cleanMsg.replace("ahmedtoldmesotalkelse", "").trim();

      if (arg === "1" || arg === "do" || arg === "digitalocean" || arg === "codeup" || arg === "") {
        configMgr.updateConfig({ primaryProvider: "digitalocean" });
        const switchText = `✅ **تم تفعيل النموذج بنجاح!**\n\n` +
          `🤖 **النموذج المتحدث الحالي**: \`Code-UP Platform Assistant (DigitalOcean Premium Model)\`\n` +
          `🔑 **مفتاح API المفعل**: \`DigitalOcean High-Performance GenAI (wbj5Ee7x...)\`\n` +
          `🛡️ **النظام والتعليمات المطبقة**: تم تطبيق برومبت النظام المتقدم المخصص لبناء وإدارة وتأمين المنصة وتعديل إعداداتها.\n\n` +
          `يمكنك الآن التحدث معه مباشرة وإعطائه أي تعليمات أو طلب تغيير إعدادات المنصة!`;
        return NextResponse.json({
          message: switchText,
          actions: [],
          source: "model_switcher",
        });
      } else if (arg === "2" || arg === "gemini") {
        configMgr.updateConfig({ primaryProvider: "gemini" });
        return NextResponse.json({
          message: "✅ تم تحويل النموذج المتحدث إلى: **Google Gemini Pool (Primary)**",
          actions: [],
          source: "model_switcher",
        });
      } else if (arg === "3" || arg === "deepseek") {
        configMgr.updateConfig({ primaryProvider: "deepseek" });
        return NextResponse.json({
          message: "✅ تم تحويل النموذج المتحدث إلى: **DeepSeek V4 Flash**",
          actions: [],
          source: "model_switcher",
        });
      } else if (arg === "4" || arg === "mock") {
        configMgr.updateConfig({ primaryProvider: "mock" });
        return NextResponse.json({
          message: "✅ تم تحويل النموذج المتحدث إلى: **Mock Provider (Local Test Model)**",
          actions: [],
          source: "model_switcher",
        });
      } else {
        const menuText = `🤖 **قائمة اختيار نموذج الذكاء الاصطناعي السري (Secret AI Model Switcher)**\n\n` +
          `أهلاً بك! لقد أدخلت كلمة السر المباشرة لاختيار النموذج المتحدث. اختر النموذج المطلوب:\n\n` +
          `1️⃣ **Code-UP Platform Assistant (DigitalOcean Premium Model)**\n` +
          `   ⚡ *النموذج الفائق الإمكانيات المخصص لبناء وإدارة وتأمين المنصة وتعديل إعداداتها*\n` +
          `   🔑 API Key: \`wbj5Ee7x...\`\n\n` +
          `2️⃣ **Google Gemini Pool (Primary Model)**\n` +
          `   🟢 *نموذج جيميناي السريع المخصص لمحادثات الطلاب العامة*\n\n` +
          `3️⃣ **DeepSeek V4 Flash**\n` +
          `   🔵 *نموذج ديب سيك للاستجابات السريعة والاحتياطية*\n\n` +
          `4️⃣ **Mock Provider (Local Test Model)**\n` +
          `   🟡 *نموذج تجميلي مجاني للاختبارات الفورية*\n\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `💡 *للتحويل المباشر اكتب رقم الخيار (مثلاً: \`1\`) أو اكتب:*\n` +
          `\`AhmedToldMeSotalkelse 1\``;
        return NextResponse.json({
          message: menuText,
          actions: [],
          source: "model_switcher",
        });
      }
    }

    // Build full student context
    let context;
    try {
      context = await buildStudentContext(session.id);
    } catch (ctxErr) {
      console.error("[chat/route] buildStudentContext failed:", ctxErr);
      return NextResponse.json({ message: "يرجى المحاولة مرة أخرى لاحقاً.", actions: [], source: "error" });
    }

    // Get conversation history (last 15 messages)
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

    // Get AI response — try AIEngine first, fallback to chatWithAI if needed
    let result;
    try {
      // First attempt: full AIEngine pipeline (DeepSeek -> Gemini Pool -> Groq)
      const { AIEngine } = await import("@/ai/AIEngine");
      const engine = new AIEngine();
      const engineRes = await engine.processRequest({
        userMessage: message,
        studentId: session.id,
        subject: context?.courses[0]?.subject || "عام",
        grade: "3",
      });

      const resText = engineRes.formattedResponse?.renderedContent || engineRes.formattedResponse?.rawContent;

      if (engineRes && engineRes.success && resText) {
        result = {
          message: resText,
          actions: [] as AIAction[],
          source: (engineRes.telemetry?.provider || "primary") as "primary" | "backup" | "fallback",
        };
      } else {
        result = await chatWithAI(message, chatHistory, context!, notifications);
      }
    } catch (aiErr) {
      console.error("[chat/route] AIEngine threw unexpectedly, falling back to chatWithAI:", aiErr);
      try {
        result = await chatWithAI(message, chatHistory, context!, notifications);
      } catch (fallbackErr) {
        console.error("[chat/route] chatWithAI also threw:", fallbackErr);
        result = {
          message: "عذراً، حدث خطأ مؤقت. حاول مرة أخرى.\n\n[م:menu]",
          actions: [] as AIAction[],
          source: "fallback" as const,
        };
      }
    }

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

    // Prune old messages: keep only last 15
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
    console.error("AI chat error:", err instanceof Error ? err.stack : err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getStudentSession() ?? await getSession();
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
            courseId: result.quiz.folder?.courseId ?? "plan",
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

        // Validate course enrollment if courseId is provided
        if (p.courseId) {
          const { checkCourseEnrollment } = await import("@/lib/authorization");
          const isEnrolled = await checkCourseEnrollment(studentId, p.courseId);
          if (!isEnrolled) {
            return { type: action.type, status: "failed", error: "غير مسجل في هذا الكورس" };
          }
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

        // Validate course enrollment
        const { checkCourseEnrollment } = await import("@/lib/authorization");
        const isEnrolled = await checkCourseEnrollment(studentId, p.courseId);
        if (!isEnrolled) {
          return { type: action.type, status: "failed", error: "غير مسجل في هذا الكورس" };
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
