import { StudentContext } from "./ai-context";
import {
  assertNoDirectIdentifiers,
  buildOutboundProviderMessages,
  buildSafeLearnerContext,
  normalizePrompt,
} from "./ai-egress";

const PRIMARY_API_KEY = process.env.AI_PRIMARY_API_KEY || "";
const PRIMARY_API_URL =
  process.env.AI_PRIMARY_BASE_URL || "https://api.anthropic.com/v1/messages";
const PRIMARY_MODEL =
  process.env.AI_PRIMARY_MODEL || "claude-3-5-sonnet-20241022";

const BACKUP_API_KEY =
  process.env.AI_BACKUP_API_KEY || process.env.GEMINI_API_KEY || "";
const BACKUP_BASE_RAW =
  process.env.AI_BACKUP_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";
const BACKUP_BASE_URL = BACKUP_BASE_RAW.replace(/\/+$/, "");
const BACKUP_MODEL = process.env.AI_BACKUP_MODEL || "gemini-2.0-flash-lite";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIAction {
  type:
    | "create_grade_request"
    | "create_ticket"
    | "submit_feedback"
    | "navigate"
    | "show_insights"
    | "none";
  payload?: Record<string, unknown>;
}

export interface AIChatResult {
  message: string;
  actions: AIAction[];
  source: "primary" | "backup" | "fallback";
}

const SYSTEM_PROMPT = `أنت "مرشد Code-UP"، مساعد تدريبي ذكي يخدم المتعلمين المصريين على منصة Code-UP.

دورك:
- تتحدث مع المتعلم باللغة العربية المصرية الودودة
- تعتمد فقط على ملخص الأداء الآمن المرفق (بدون أسماء أو هواتف أو إيميلات)
- تساعد في الخطة التدريبية وتحليل الأداء وطلبات الدعم

قواعد:
- لا تطلب ولا تخمّن بيانات تعريف مباشرة (اسم، إيميل، هاتف)
- لا تعدّل الدرجات مباشرة
- كن صادقاً ومختصراً

الرد JSON:
{
  "message": "...",
  "actions": [{ "type": "none" | "show_insights" | "create_grade_request" | "create_ticket" | "submit_feedback" | "navigate", "payload": {} }]
}`;

async function callPrimary(
  messages: ChatMessage[],
): Promise<AIChatResult | null> {
  if (!PRIMARY_API_KEY) return null;
  try {
    assertNoDirectIdentifiers(messages);
    const sys = messages.find((m) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m) => m.role !== "system");
    const res = await fetch(PRIMARY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PRIMARY_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: PRIMARY_MODEL,
        max_tokens: 1200,
        temperature: 0.6,
        system: sys,
        messages: userMsgs.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Primary API: ${res.status}`);
    const data = (await res.json()) as { content: Array<{ text: string }> };
    const raw = data.content[0]?.text || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    return {
      message: String(parsed.message || raw),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      source: "primary",
    };
  } catch {
    console.error("[ai-assistant] primary provider failed");
    return null;
  }
}

async function callBackup(
  messages: ChatMessage[],
): Promise<AIChatResult | null> {
  if (!BACKUP_API_KEY) return null;
  try {
    assertNoDirectIdentifiers(messages);
    const sys = messages.find((m) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m) => m.role !== "system");
    const promptText = sys
      ? `[النظام: ${sys}]\n\n` +
        userMsgs
          .map(
            (m) =>
              `${m.role === "user" ? "المتعلم" : "المرشد"}: ${m.content}`,
          )
          .join("\n")
      : userMsgs
          .map(
            (m) =>
              `${m.role === "user" ? "المتعلم" : "المرشد"}: ${m.content}`,
          )
          .join("\n");

    const geminiBase = BACKUP_BASE_URL.endsWith("/models")
      ? BACKUP_BASE_URL
      : `${BACKUP_BASE_URL}/models`;
    const url = `${geminiBase}/${BACKUP_MODEL}:generateContent?key=${BACKUP_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`Backup AI ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    return {
      message: String(parsed.message || raw),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      source: "backup",
    };
  } catch {
    console.error("[ai-assistant] backup provider failed");
    return null;
  }
}

function getMenuState(history: ChatMessage[]): { state: string; data: string } {
  const lastAssistant = [...history]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistant) return { state: "menu", data: "" };
  const match = lastAssistant.content.match(/\[م:([^:\]]+)(?::([^\]]*))?\]/);
  return match
    ? { state: match[1], data: match[2] || "" }
    : { state: "menu", data: "" };
}

function buildMainMenu(ctx: StudentContext, notifications?: string): string {
  let menu = "";
  if (notifications) {
    menu += `${notifications}\n\n━━━━━━━━━━━━━━━━\n\n`;
  }
  menu += `اختار رقم:\n\n`;
  menu += `1  تحليل أدائي ودرجاتي\n`;
  menu += `2  خطة تدريبية\n`;
  menu += `3  طلب تعديل درجة\n`;
  menu += `4  تقديم شكوى\n`;
  menu += `5  حالة طلباتي\n\n`;
  menu += `${ctx.overallStats.totalCourses} كورس | متوسط ${ctx.overallStats.averageScore}%\n\n[م:menu]`;
  return menu;
}

function buildPerformanceAnalysis(ctx: StudentContext): string {
  const allQuizResults = ctx.courses.flatMap((c) =>
    c.quizResults.filter((q) => q.date),
  );
  const lowQuizzes = ctx.courses.flatMap((c) =>
    c.quizResults
      .filter((q) => q.date && q.percentage < 60)
      .map((q) => `• ${c.subject} - موضوع: ${Math.round(q.percentage)}%`),
  );
  let a = `تحليل أدائك:\n\nمتوسط الدرجات: ${ctx.overallStats.averageScore}%\nكويزات محلولة: ${allQuizResults.length}\nفيديوهات متشافة: ${ctx.overallStats.totalVideosWatched}\n`;
  if (lowQuizzes.length > 0) {
    a += `\nمحتاج تراجع:\n${lowQuizzes.slice(0, 3).join("\n")}\n`;
  }
  if (ctx.weakAreas.length > 0) {
    a += `\nنقاط ضعف:\n${ctx.weakAreas
      .slice(0, 3)
      .map((w) => `• ${w.subject}: ${w.topic}`)
      .join("\n")}\n`;
  }
  if (lowQuizzes.length === 0 && ctx.weakAreas.length === 0) {
    a += `\nأداء ممتاز! مفيش نقاط ضعف.\n`;
  }
  a += `\nاكتب 0 للرجوع\n\n[م:1]`;
  return a;
}

function buildStudyPlan(ctx: StudentContext): string {
  const weakSubjects = ctx.weakAreas
    .map((w) => w.subject)
    .filter((v, i, a) => a.indexOf(v) === i);
  const coursesInfo = ctx.courses.map((c) => ({
    title: c.subject,
    unwatched: c.progress.totalVideos - c.progress.videosWatched,
    lowQuizzes: c.quizResults.filter((q) => q.date && q.percentage < 60)
      .length,
    progress: c.progress.percentage,
  }));
  const priority = coursesInfo.filter(
    (c) => c.unwatched > 0 || c.lowQuizzes > 0,
  );
  let plan = `خطتك النهاردة:\n\n`;
  if (priority.length > 0) {
    plan += priority
      .slice(0, 3)
      .map((c) => {
        const tasks: string[] = [];
        if (c.unwatched > 0) tasks.push(`شوف ${Math.min(c.unwatched, 2)} فيديو`);
        if (c.lowQuizzes > 0) tasks.push(`راجع الكويزات الضعيفة`);
        return `${c.title} (${c.progress}%):\n   ${tasks.join(" + ")}`;
      })
      .join("\n\n");
    if (weakSubjects.length > 0) {
      plan += `\n\nركّز على: ${weakSubjects.join("، ")}`;
    }
  } else {
    plan += `ممتاز! راجع الكويزات اللي أقل من 80%.`;
  }
  plan += `\n\nاكتب 0 للرجوع\n\n[م:2]`;
  return plan;
}

function buildQuizList(ctx: StudentContext): {
  list: string;
  hasQuizzes: boolean;
} {
  const quizzes = ctx.courses.flatMap((c) =>
    c.quizResults
      .filter((q) => q.date)
      .map((q) => ({
        code: q.quizId.slice(-8).toUpperCase(),
        score: Math.round(q.percentage),
        subject: c.subject,
      })),
  );
  if (quizzes.length === 0) return { list: "", hasQuizzes: false };
  return {
    list: quizzes
      .map((q) => `  ${q.code} → ${q.subject} - ${q.score}%`)
      .join("\n"),
    hasQuizzes: true,
  };
}

function stripFallbackMarkers(content: string): string {
  return content.replace(/\[م:[^\]]+\]/g, "").trim();
}

function fallbackResponse(
  userMessage: string,
  ctx: StudentContext,
  history: ChatMessage[],
  notifications?: string,
): AIChatResult {
  const input = normalizePrompt(userMessage);
  const actions: AIAction[] = [];
  let message = "";
  const { state, data } = getMenuState(history);

  if (input === "0" || input.includes("رجوع") || input.includes("القائمة")) {
    return {
      message: buildMainMenu(ctx, notifications),
      actions: [],
      source: "fallback",
    };
  }

  if (state === "3a") {
    const code = input.toUpperCase().replace(/\s/g, "");
    const allQuizzes = ctx.courses.flatMap((c) =>
      c.quizResults
        .filter((q) => q.date)
        .map((q) => ({
          quizId: q.quizId,
          code: q.quizId.slice(-8).toUpperCase(),
          percentage: q.percentage,
          subject: c.subject,
        })),
    );
    const selected = allQuizzes.find(
      (q) => q.code === code || (code.length >= 4 && q.code.includes(code)),
    );
    if (selected) {
      message = `تم اختيار كويز (${selected.subject})\nدرجتك: ${Math.round(selected.percentage)}%\n\nاكتب سبب التعديل بالتفصيل (20 حرف على الأقل)\n\nاكتب 0 للرجوع\n\n[م:3b:${selected.quizId}]`;
    } else {
      message = `كود غلط. اكتب الكود من القائمة.\n\nاكتب 0 للرجوع\n\n[م:3a]`;
    }
    return { message, actions, source: "fallback" };
  }

  if (state === "3b" && data) {
    if (input.length < 20) {
      message = `السبب قصير (${input.length}/20). اكتب تفاصيل أكتر.\n\nاكتب 0 للرجوع\n\n[م:3b:${data}]`;
    } else {
      actions.push({
        type: "create_grade_request",
        payload: { quizId: data, reason: input },
      });
      message = `تم إرسال طلب تعديل الدرجة.\n\nاكتب 5 لمتابعة الحالة.\n\nاكتب 0 للرجوع\n\n[م:menu]`;
    }
    return { message, actions, source: "fallback" };
  }

  if (state === "4a") {
    if (input.length < 10) {
      message = `اكتب تفاصيل أكتر (${input.length}/10).\n\nاكتب 0 للرجوع\n\n[م:4a]`;
    } else {
      const courseId = ctx.courses[0]?.id;
      actions.push({
        type: "create_ticket",
        payload: {
          title: `شكوى: ${input.slice(0, 50)}`,
          description: input,
          type: "complaint",
          priority: "normal",
          courseId,
        },
      });
      message = `تم تسجيل شكواك.\n\nاكتب 5 لمتابعة الحالة.\n\nاكتب 0 للرجوع\n\n[م:menu]`;
    }
    return { message, actions, source: "fallback" };
  }

  const choice = input.replace(/[^\d]/g, "");
  const isPerf =
    choice === "1" ||
    /أداء|اداء|حلل|تحليل|درج|نتيج|score|grade|performance/i.test(input);
  const isPlan =
    choice === "2" ||
    /خطة|خطه|جدول|اذاكر|مذاكرة|plan|study/i.test(input);
  const isEdit =
    choice === "3" || /تعديل.*درج|grade.*fix|درجة غلط/i.test(input);
  const isComplaint =
    choice === "4" || /شكوى|complaint|report/i.test(input);
  const isStatus =
    choice === "5" || /حالة.*طلب|status|طلباتي/i.test(input);

  if (isPerf) message = buildPerformanceAnalysis(ctx);
  else if (isPlan) message = buildStudyPlan(ctx);
  else if (isEdit) {
    const { list, hasQuizzes } = buildQuizList(ctx);
    message = hasQuizzes
      ? `طلب تعديل درجة\n\nكويزاتك:\n${list}\n\nاكتب كود الكويز:\n\nاكتب 0 للرجوع\n\n[م:3a]`
      : `مفيش كويزات محلولة لسه.\n\n${buildMainMenu(ctx)}`;
  } else if (isComplaint) {
    message = `تقديم شكوى\n\nاكتب تفاصيل شكواك:\n\nاكتب 0 للرجوع\n\n[م:4a]`;
  } else if (isStatus) {
    actions.push({ type: "show_insights", payload: { checkStatus: true } });
    message = `جاري تحميل حالة طلباتك...\n\n[م:5]`;
  } else {
    message = buildMainMenu(ctx, notifications);
  }

  return { message, actions, source: "fallback" };
}

export async function chatWithAI(
  userMessage: string,
  history: ChatMessage[],
  studentContext: StudentContext,
  notifications?: string,
): Promise<AIChatResult> {
  const safeContext = buildSafeLearnerContext({
    educationalStage: studentContext.profile.educationalStage,
    courseCount: studentContext.overallStats.totalCourses,
    averageScore: studentContext.overallStats.averageScore,
    quizzesTaken: studentContext.overallStats.totalQuizzesTaken,
    videosWatched: studentContext.overallStats.totalVideosWatched,
    subjects: studentContext.courses.map((c) => c.subject),
    weakTopics: studentContext.weakAreas.map((w) => w.topic),
  });

  const knownNames = [studentContext.profile.name].filter(Boolean);

  const cleanHistory = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: stripFallbackMarkers(m.content),
    }))
    .filter((m) => m.content.length > 0);

  // Only sanitized payload may leave the server.
  const messages = buildOutboundProviderMessages({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    safeContext,
    history: cleanHistory,
    knownNames,
  });

  let result = await callBackup(messages);
  if (result) return result;

  result = await callPrimary(messages);
  if (result) return result;

  // Deterministic local fallback — never requires external providers.
  return fallbackResponse(userMessage, studentContext, history, notifications);
}

export async function analyzeQuizAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  options: Record<string, string>,
): Promise<{ wasMisgraded: boolean; reasoning: string; confidence: number }> {
  const prompt = normalizePrompt(
    `حلل سؤال الكويز:\nالسؤال: ${question}\nخيارات: ${JSON.stringify(options)}\nإجابة المتعلم: ${studentAnswer}\nالإجابة المعتمدة: ${correctAnswer}\nرد JSON: {"wasMisgraded":boolean,"reasoning":string,"confidence":number}`,
  );
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "أنت مدرس خبير. رد بـ JSON فقط. لا تطلب بيانات تعريف.",
    },
    { role: "user", content: prompt },
  ];
  const result = await callPrimary(messages);
  if (result?.message) {
    try {
      const match = result.message.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed) {
        return {
          wasMisgraded: !!parsed.wasMisgraded,
          reasoning: String(parsed.reasoning || ""),
          confidence: Number(parsed.confidence || 0.5),
        };
      }
    } catch {
      // fall through
    }
  }
  return {
    wasMisgraded: false,
    reasoning: "لم نتمكن من تحليل السؤال تلقائياً، يرجى مراجعة المعلم",
    confidence: 0,
  };
}

export async function generateInsights(
  studentContext: StudentContext,
): Promise<
  Array<{
    type: string;
    category: string;
    title: string;
    description: string;
    confidence: number;
  }>
> {
  // Local-only insights — no external egress of learner history.
  const insights: Array<{
    type: string;
    category: string;
    title: string;
    description: string;
    confidence: number;
  }> = [];
  for (const weak of studentContext.weakAreas.slice(0, 3)) {
    insights.push({
      type: "weak_area",
      category: weak.subject,
      title: `ضعف في ${weak.topic}`,
      description: weak.reason,
      confidence: 0.8,
    });
  }
  if (studentContext.overallStats.averageScore >= 80) {
    insights.push({
      type: "strength",
      category: "general",
      title: "أداء متميز",
      description: `متوسطك ${studentContext.overallStats.averageScore}%`,
      confidence: 0.9,
    });
  }
  return insights;
}
