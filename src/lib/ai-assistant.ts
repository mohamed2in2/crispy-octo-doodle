import { StudentContext } from "./ai-context";
import { callAI } from "./ai-caller";
import {
  assertNoDirectIdentifiers,
  buildOutboundProviderMessages,
  buildSafeLearnerContext,
  normalizePrompt,
} from "./ai-egress";

const PRIMARY_API_KEY =
  process.env.AI_PRIMARY_API_KEY || process.env.ANTHROPIC_API_KEY || "";
const PRIMARY_API_URL =
  process.env.AI_PRIMARY_BASE_URL || "https://api.anthropic.com/v1/messages";
const PRIMARY_MODEL =
  process.env.AI_PRIMARY_MODEL || "claude-3-5-sonnet-20241022";

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
- تتحدث مع المتعلم باللغة العربية المصرية الودودة والواضحة
- تساعد في الخطة التدريبية، الشرح، تحليل الأداء وطلبات الدعم
- تفهم أي سؤال تسأله وتجيب عنه بدقة وبسرعة

قواعد:
- لا تطلب ولا تخمّن بيانات تعريف شخصية حساسة (كلمات مرور أو أرقام حسابات)
- كن صادقاً ومختصراً ومفيداً

الرد JSON:
{
  "message": "نص إجابتك هنا بأسلوب ممتاز ومباشر",
  "actions": [{ "type": "none" }]
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
    let parsed: Record<string, unknown> = {};
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fallback to raw */ }
    }
    return {
      message: String(parsed.message || raw),
      actions: Array.isArray(parsed.actions) ? (parsed.actions as AIAction[]) : [],
      source: "primary",
    };
  } catch {
    console.error("[ai-assistant] primary provider failed");
    return null;
  }
}

async function callGeminiProvider(
  messages: ChatMessage[],
): Promise<AIChatResult | null> {
  const hasKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY_1 ||
    process.env.GEMINI_API_KEY_2 ||
    process.env.AI_BACKUP_API_KEY ||
    process.env.AI_PRIMARY_API_KEY;

  if (!hasKey) return null;

  try {
    assertNoDirectIdentifiers(messages);
    const sys = messages.find((m) => m.role === "system")?.content || SYSTEM_PROMPT;
    const userMsgs = messages.filter((m) => m.role !== "system");
    const promptText = userMsgs
      .map((m) => `${m.role === "user" ? "المتعلم" : "المرشد"}: ${m.content}`)
      .join("\n");

    const { text } = await callAI(promptText, {
      systemPrompt: sys,
      maxTokens: 1200,
      temperature: 0.7,
    });

    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    let parsed: Record<string, unknown> = {};
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fallback */ }
    }
    return {
      message: String(parsed.message || text),
      actions: Array.isArray(parsed.actions) ? (parsed.actions as AIAction[]) : [],
      source: "backup",
    };
  } catch (err) {
    console.error("[ai-assistant] Gemini provider error:", err);
    return null;
  }
}

async function callOpenAIProvider(
  messages: ChatMessage[],
): Promise<AIChatResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    assertNoDirectIdentifiers(messages);
    const sys = messages.find((m) => m.role === "system")?.content || SYSTEM_PROMPT;
    const userMsgs = messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          ...userMsgs.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content || "";
    const match = raw.match(/\{[\s\S]*\}/);
    let parsed: Record<string, unknown> = {};
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch { /* fallback */ }
    }
    return {
      message: String(parsed.message || raw),
      actions: Array.isArray(parsed.actions) ? (parsed.actions as AIAction[]) : [],
      source: "primary",
    };
  } catch (err) {
    console.error("[ai-assistant] OpenAI provider error:", err);
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
    a += `\nمواضيع محتاجة تحسين:\n${lowQuizzes.join("\n")}\n`;
  } else {
    a += `\nأداءك ممتاز مافيش مواضيع قاطعة لـ 60%\n`;
  }
  a += `\nاكتب 0 للرجوع\n\n[م:1]`;
  return a;
}

function buildTrainingPlan(ctx: StudentContext): string {
  let p = `خطة تدريبية مخصصة:\n\n`;
  if (ctx.weakAreas.length > 0) {
    p += `التركيز على:\n`;
    for (const w of ctx.weakAreas) {
      p += `• ${w.subject}: ${w.topic}\n`;
    }
  } else {
    p += `شاهد كورس واحد واعمل كويز تجريبي يومياً.\n`;
  }
  p += `\nاكتب 0 للرجوع\n\n[م:2]`;
  return p;
}

function fallbackResponse(
  userMessage: string,
  ctx: StudentContext,
  history: ChatMessage[],
  notifications?: string,
): AIChatResult {
  const trimmed = userMessage.trim();
  const menuState = getMenuState(history);

  if (trimmed === "0" || trimmed === "رجوع" || trimmed === "الرئيسية") {
    return {
      message: buildMainMenu(ctx, notifications),
      actions: [{ type: "none" }],
      source: "fallback",
    };
  }

  if (trimmed === "1") {
    return {
      message: buildPerformanceAnalysis(ctx),
      actions: [{ type: "none" }],
      source: "fallback",
    };
  }

  if (trimmed === "2") {
    return {
      message: buildTrainingPlan(ctx),
      actions: [{ type: "none" }],
      source: "fallback",
    };
  }

  if (trimmed === "3") {
    const activeQuizzes = ctx.courses.flatMap((c) =>
      c.quizResults.map((q) => `• ${q.quizTitle} (${q.score}/${q.totalQ})`),
    );
    let msg = `طلب تعديل درجة كويز:\n\n`;
    if (activeQuizzes.length > 0) {
      msg += `الكويزات الأخيرة:\n${activeQuizzes.slice(0, 5).join("\n")}\n\nاكتب اسم الكويز ورقم السؤال والسبب.\n`;
    } else {
      msg += `اكتب اسم الكويز والسبب لتسجيل الطلب للمعلم.\n`;
    }
    msg += `\nاكتب 0 للرجوع\n\n[م:3]`;
    return {
      message: msg,
      actions: [{ type: "none" }],
      source: "fallback",
    };
  }

  if (trimmed === "4") {
    return {
      message: `تقديم شكوى أو ملاحظة:\n\nاكتب تفاصيل المشكلة وسوف يتم إرسالها لجدول الدعم.\n\nاكتب 0 للرجوع\n\n[م:4]`,
      actions: [{ type: "none" }],
      source: "fallback",
    };
  }

  if (trimmed === "5") {
    return {
      message: `جاري فحص حالة طلباتك...\n\n[م:5]`,
      actions: [{ type: "show_insights", payload: { checkStatus: true } }],
      source: "fallback",
    };
  }

  if (menuState.state === "3") {
    return {
      message: `تم استلام طلب تعديل الدرجة بنجاح! سيتم مراجعته من المدرس.\n\nاكتب 0 للرجوع\n\n[م:menu]`,
      actions: [
        {
          type: "create_grade_request",
          payload: { reason: trimmed },
        },
      ],
      source: "fallback",
    };
  }

  if (menuState.state === "4") {
    return {
      message: `تم تسجيل الشكوى بنجاح! فريق الدعم سيتواصل معك.\n\nاكتب 0 للرجوع\n\n[م:menu]`,
      actions: [
        {
          type: "create_ticket",
          payload: { title: "شكوى من المتعلم", description: trimmed },
        },
      ],
      source: "fallback",
    };
  }

  return {
    message: buildMainMenu(ctx, notifications),
    actions: [{ type: "none" }],
    source: "fallback",
  };
}

function stripFallbackMarkers(text: string): string {
  return text.replace(/\[م:[^\]]+\]/g, "").trim();
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

  const messages = buildOutboundProviderMessages({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    safeContext,
    history: cleanHistory,
    knownNames,
  });

  // 1. Try Gemini provider (uses GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, AI_BACKUP_API_KEY, AI_PRIMARY_API_KEY)
  let result = await callGeminiProvider(messages);
  if (result) return result;

  // 2. Try OpenAI provider if OPENAI_API_KEY exists
  result = await callOpenAIProvider(messages);
  if (result) return result;

  // 3. Try Anthropic provider if ANTHROPIC_API_KEY / AI_PRIMARY_API_KEY exists
  result = await callPrimary(messages);
  if (result) return result;

  // 4. Deterministic local fallback menu when no API keys are present
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
  const result = (await callGeminiProvider(messages)) || (await callPrimary(messages));
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
