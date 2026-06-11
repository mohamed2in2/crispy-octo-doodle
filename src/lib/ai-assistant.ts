import { StudentContext } from "./ai-context";

const PRIMARY_API_KEY = process.env.AI_PRIMARY_API_KEY || "";
const PRIMARY_API_URL = process.env.AI_PRIMARY_BASE_URL || "https://api.anthropic.com/v1/messages";
const PRIMARY_MODEL = process.env.AI_PRIMARY_MODEL || "claude-3-5-sonnet-20241022";

const BACKUP_API_KEY = process.env.AI_BACKUP_API_KEY || "";
const BACKUP_API_URL = process.env.AI_BACKUP_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models";
const BACKUP_MODEL = process.env.AI_BACKUP_MODEL || "gemini-1.5-flash";

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
- لديك صلاحية كاملة لرؤية كل بيانات المتعلم: درجاته، تقدمه، كورساته، نقاط ضعفه، وملاحظاته
- تعرف المتعلم جيداً وتتحدث معه كمرشد شخصي يفهم وضعه
- أنت جزء من الموقع، لست مجرد بوت - تساعد المتعلم في استخدام كل الأدوات المتاحة

ما تقدر تعمله:
1. **خطة تدريبية مخصصة** - بناءً على نقاط ضعف المتعلم الحقيقية
2. **تحليل الأداء** - تشرح للمتعلم فين هو ضعيف وليه
3. **طلب تعديل درجة** - لو المتعلم أكد إن في إجابة صحيحة وحُسبت غلط، اعمل GradeAdjustmentRequest (المعلم هو اللي يوافق)
4. **استلام شكاوى** - لو المتعلم مش مرتاح من المعلم أو الكورس، سجلها كـ StudentFeedback
5. **خطة بديلة** - لو المتعلم بياخد الكورس مع حد تاني، اعمله خطة مختلفة بدون الفيديوهات اللي شافها برة
6. **توجيه** - وجّه المتعلم لصفحة الكورس أو المكتبة المناسبة
7. **تذكرة دعم** - لو فيه مشكلة فنية أو محتوى غلط، اعمل SupportTicket

قواعد مهمة جداً:
- **لا تعدّل الدرجات مباشرة** - فقط أنشئ طلب تعديل وانتظر موافقة المعلم
- **لا تعتمد طلبات تعديل تافهة** - تأكد إن المتعلم فعلاً عنده سبب قوي (إجابة صحيحة لكن متسجلة غلط، أو سؤال غامض)
- **كن صادقاً** - لو المتعلم فعلاً ضعيف في موضوع، قوله بأدب، متجاملوش
- **اقترح حلول عملية** - مش مجرد كلام عام
- **استخدم بيانات المتعلم** - قوله "شفت إنك جبت 40% في كويز كذا" مش "حاول تذاكر"

الرد يجب أن يكون JSON بالشكل ده:
{
  "message": "ردك للمتعلم باللغة العربية",
  "actions": [
    {
      "type": "create_grade_request" | "create_ticket" | "submit_feedback" | "navigate" | "show_insights" | "none",
      "payload": { ... }
    }
  ]
}

أنواع الـ payload:
- create_grade_request: { quizId, reason, requestedScore, evidence }
- create_ticket: { title, description, type, priority }
- submit_feedback: { courseId, type, content, rating? }
- navigate: { path, reason }
- show_insights: {}`;

function summarizeContext(ctx: StudentContext): string {
  const courseLines = ctx.courses
    .map((c) => {
      const quizSummary = c.quizResults
        .filter((q) => q.date)
        .map((q) => `${q.quizTitle}: ${Math.round(q.percentage)}%`)
        .join(", ");
      return `- ${c.title} (${c.subject}, مدرس: ${c.teacher}): تقدم ${c.progress.percentage}% (${c.progress.videosWatched}/${c.progress.totalVideos} فيديو)${quizSummary ? `, كويزات: ${quizSummary}` : ""}`;
    })
    .join("\n");

  const weakAreasText = ctx.weakAreas.length > 0
    ? ctx.weakAreas.map((w) => `- ${w.subject}: ${w.topic} (${w.reason})`).join("\n")
    : "لا يوجد نقاط ضعف واضحة";

  const insightsText = ctx.aiInsights.length > 0
    ? ctx.aiInsights.map((i) => `- [${i.type}] ${i.title}: ${i.description}`).join("\n")
    : "لا يوجد رؤى سابقة";

  const feedbackText = ctx.recentFeedback.length > 0
    ? ctx.recentFeedback.map((f) => `- [${f.type}] في ${f.course}: ${f.content}`).join("\n")
    : "لم يقدم ملاحظات سابقة";

  return `بيانات المتعلم الكاملة:

الملف الشخصي:
- الاسم: ${ctx.profile.name}
- العمر: ${ctx.profile.age ?? "غير محدد"}
- المرحلة التدريبية: ${ctx.profile.educationalStage ?? "غير محددة"}

الإحصائيات العامة:
- عدد الكورسات: ${ctx.overallStats.totalCourses}
- متوسط الدرجات: ${ctx.overallStats.averageScore}%
- عدد الكويزات المحلولة: ${ctx.overallStats.totalQuizzesTaken}
- عدد الفيديوهات المشاهَدة: ${ctx.overallStats.totalVideosWatched}

الكورسات وتقدم المتعلم فيها:
${courseLines || "لم يسجل في كورسات بعد"}

نقاط الضعف الحالية:
${weakAreasText}

رؤى سابقة من الذكاء الاصطناعي:
${insightsText}

ملاحظات المتعلم الأخيرة:
${feedbackText}`;
}

async function callPrimary(messages: ChatMessage[]): Promise<AIChatResult | null> {
  if (!PRIMARY_API_KEY) return null;
  try {
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
        messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Primary API: ${res.status}`);
    const data = (await res.json()) as { content: Array<{ text: string }> };
    const raw = data.content[0]?.text || "{}";
    // Find first JSON object in response
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    return {
      message: String(parsed.message || raw),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      source: "primary",
    };
  } catch (err) {
    console.error("Primary AI error:", err);
    return null;
  }
}

async function callBackup(messages: ChatMessage[]): Promise<AIChatResult | null> {
  if (!BACKUP_API_KEY) return null;
  try {
    // Combine system + user messages for Gemini
    const systemMsg = messages.find((m) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m) => m.role !== "system");
    const combinedPrompt = systemMsg 
      ? `${systemMsg}\n\n${userMsgs.map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : userMsgs.map((m) => m.content).join("\n");

    const url = `${BACKUP_API_URL}/${BACKUP_MODEL}:generateContent?key=${BACKUP_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1200,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Backup API: ${res.status}`);
    const data = (await res.json()) as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    // Find first JSON object in response
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    return {
      message: String(parsed.message || raw),
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      source: "backup",
    };
  } catch (err) {
    console.error("Backup AI error:", err);
    return null;
  }
}

// ── Menu state detection ──
function getMenuState(history: ChatMessage[]): { state: string; data: string } {
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return { state: "menu", data: "" };
  const match = lastAssistant.content.match(/\[م:([^:\]]+)(?::([^\]]*))?\]/);
  return match ? { state: match[1], data: match[2] || "" } : { state: "menu", data: "" };
}

function buildMainMenu(ctx: StudentContext, notifications?: string): string {
  let menu = "";
  if (notifications) {
    menu += `🔔 ${notifications}\n\n━━━━━━━━━━━━━━━━\n\n`;
  }
  menu += `اختار رقم:\n\n`;
  menu += `1️⃣  تحليل أدائي ودرجاتي\n`;
  menu += `2️⃣  خطة تدريبية\n`;
  menu += `3️⃣  طلب تعديل درجة ✏️\n`;
  menu += `4️⃣  تقديم شكوى 📢\n`;
  menu += `5️⃣  حالة طلباتي 📋\n\n`;
  menu += `📊 ${ctx.overallStats.totalCourses} كورس | متوسط ${ctx.overallStats.averageScore}%\n\n[م:menu]`;
  return menu;
}

function buildPerformanceAnalysis(ctx: StudentContext): string {
  const allQuizResults = ctx.courses.flatMap((c) => c.quizResults.filter((q) => q.date));
  const lowQuizzes = ctx.courses
    .flatMap((c) => c.quizResults.filter((q) => q.date && q.percentage < 60).map((q) => `• ${c.title} - ${q.quizTitle} (${Math.round(q.percentage)}%)`));
  const highQuizzes = ctx.courses
    .flatMap((c) => c.quizResults.filter((q) => q.date && q.percentage >= 80).map((q) => `• ${c.title} - ${q.quizTitle} (${Math.round(q.percentage)}%)`));

  let a = `📊 تحليل أدائك:\n\nمتوسط الدرجات: ${ctx.overallStats.averageScore}%\nكويزات محلولة: ${allQuizResults.length}\nفيديوهات متشافة: ${ctx.overallStats.totalVideosWatched}\n`;
  if (highQuizzes.length > 0) a += `\n💪 نقاط قوتك:\n${highQuizzes.slice(0, 3).join("\n")}\n`;
  if (lowQuizzes.length > 0) a += `\n⚠️ محتاج تراجع:\n${lowQuizzes.slice(0, 3).join("\n")}\n`;
  if (ctx.weakAreas.length > 0) a += `\n📌 نقاط ضعف:\n${ctx.weakAreas.slice(0, 3).map((w) => `• ${w.subject}: ${w.topic}`).join("\n")}\n`;
  if (lowQuizzes.length === 0 && ctx.weakAreas.length === 0) a += `\n✅ أداء ممتاز! مفيش نقاط ضعف.\n`;
  a += `\nاكتب 0 للرجوع\n\n[م:1]`;
  return a;
}

function buildStudyPlan(ctx: StudentContext): string {
  const weakSubjects = ctx.weakAreas.map((w) => w.subject).filter((v, i, a) => a.indexOf(v) === i);
  const coursesInfo = ctx.courses.map((c) => ({
    title: c.title, unwatched: c.progress.totalVideos - c.progress.videosWatched,
    lowQuizzes: c.quizResults.filter((q) => q.date && q.percentage < 60).length, progress: c.progress.percentage,
  }));
  const priority = coursesInfo.filter((c) => c.unwatched > 0 || c.lowQuizzes > 0);
  let plan = `📋 خطتك النهاردة:\n\n`;
  if (priority.length > 0) {
    plan += priority.slice(0, 3).map((c) => {
      const tasks: string[] = [];
      if (c.unwatched > 0) tasks.push(`شوف ${Math.min(c.unwatched, 2)} فيديو`);
      if (c.lowQuizzes > 0) tasks.push(`راجع الكويزات الضعيفة`);
      return `📚 ${c.title} (${c.progress}%):\n   ${tasks.join(" + ")}`;
    }).join("\n\n");
    if (weakSubjects.length > 0) plan += `\n\n⚠️ ركّز على: ${weakSubjects.join("، ")}`;
  } else {
    plan += `ممتاز! 🎉 خالص كل حاجة. راجع الكويزات اللي أقل من 80%.`;
  }
  plan += `\n\nاكتب 0 للرجوع\n\n[م:2]`;
  return plan;
}

function buildQuizList(ctx: StudentContext): { list: string; hasQuizzes: boolean } {
  const quizzes = ctx.courses.flatMap((c) =>
    c.quizResults.filter((q) => q.date).map((q) => ({
      code: q.quizId.slice(-8).toUpperCase(), title: q.quizTitle, course: c.title, score: Math.round(q.percentage),
    }))
  );
  if (quizzes.length === 0) return { list: "", hasQuizzes: false };
  return {
    list: quizzes.map((q) => `  ${q.code} → ${q.title} (${q.course}) - ${q.score}%`).join("\n"),
    hasQuizzes: true,
  };
}

function buildChatContextForStaff(history: ChatMessage[], ctx: StudentContext): { chatHistory: string; studentInfo: string } {
  const chatHistory = history.slice(-8).map((m) =>
    `${m.role === "user" ? "المتعلم" : "المرشد"}: ${m.content.replace(/\[م:[^\]]+\]/g, "").trim()}`
  ).join("\n");
  const studentInfo = [
    `الاسم: ${ctx.profile.name}`,
    `المرحلة: ${ctx.profile.educationalStage || "غير محدد"}`,
    `العمر: ${ctx.profile.age ?? "غير محدد"}`,
    `متوسط الدرجات: ${ctx.overallStats.averageScore}%`,
    `الكورسات: ${ctx.overallStats.totalCourses}`,
    `كويزات محلولة: ${ctx.overallStats.totalQuizzesTaken}`,
    `فيديوهات متشافة: ${ctx.overallStats.totalVideosWatched}`,
    ctx.weakAreas.length > 0 ? `نقاط ضعف: ${ctx.weakAreas.map((w) => `${w.subject}: ${w.topic}`).join("، ")}` : "",
  ].filter(Boolean).join("\n");
  return { chatHistory, studentInfo };
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
  const input = userMessage.trim();
  const actions: AIAction[] = [];
  let message = "";

  const { state, data } = getMenuState(history);

  // ── Back to menu from any state ──
  if (input === "0" || input.includes("رجوع") || input.includes("القائمة")) {
    return { message: buildMainMenu(ctx, notifications), actions: [], source: "fallback" };
  }

  // ── State: Grade - Select Quiz (3a) ──
  if (state === "3a") {
    const code = input.toUpperCase().replace(/\s/g, "");
    const allQuizzes = ctx.courses.flatMap((c) =>
      c.quizResults.filter((q) => q.date).map((q) => ({
        quizId: q.quizId, quizTitle: q.quizTitle, courseTitle: c.title,
        code: q.quizId.slice(-8).toUpperCase(), percentage: q.percentage,
      }))
    );
    const selected = allQuizzes.find((q) => q.code === code || (code.length >= 4 && q.code.includes(code)));
    if (selected) {
      message = `✅ ${selected.quizTitle} (${selected.courseTitle})\nدرجتك: ${Math.round(selected.percentage)}%\n\n⬇️ اكتب سبب التعديل بالتفصيل:\n• رقم السؤال\n• إجابتك الصحيحة\n• ليه تفتكر إنها صح\n\n💡 مثال: "سؤال 2 إجابتي ب وهي الصح لأن..."\n\nاكتب 0 للرجوع\n\n[م:3b:${selected.quizId}]`;
    } else {
      message = `❌ كود غلط. اكتب الكود من القائمة (8 حروف).\n\nاكتب 0 للرجوع\n\n[م:3a]`;
    }
    return { message, actions, source: "fallback" };
  }

  // ── State: Grade - Write Reason (3b) ──
  if (state === "3b" && data) {
    if (input.length < 20) {
      message = `❌ السبب قصير (${input.length}/20 حرف). اكتب تفاصيل أكتر.\n\nاكتب 0 للرجوع\n\n[م:3b:${data}]`;
    } else {
      const staffCtx = buildChatContextForStaff(history, ctx);
      actions.push({
        type: "create_grade_request",
        payload: { quizId: data, reason: input, evidence: JSON.stringify(staffCtx) },
      });
      message = `✅ تم إرسال طلب تعديل الدرجة للمعلم!\n\n📋 السبب: ${input.slice(0, 80)}${input.length > 80 ? "..." : ""}\n\n⏳ المعلم هيراجع طلبك. اكتب 5 لمتابعة الحالة.\n\nاكتب 0 للرجوع\n\n[م:menu]`;
    }
    return { message, actions, source: "fallback" };
  }

  // ── State: Complaint - Write Details (4a) ──
  if (state === "4a") {
    if (input.length < 10) {
      message = `❌ اكتب تفاصيل أكتر (${input.length}/10 حرف).\n\nاكتب 0 للرجوع\n\n[م:4a]`;
    } else {
      const staffCtx = buildChatContextForStaff(history, ctx);
      const courseId = ctx.courses.length > 0 ? ctx.courses[0].id : undefined;
      actions.push({
        type: "create_ticket",
        payload: {
          title: `شكوى: ${input.slice(0, 50)}`,
          description: input,
          type: "complaint",
          priority: "normal",
          courseId,
          chatHistory: staffCtx.chatHistory,
          studentInfo: staffCtx.studentInfo,
        },
      });
      message = `✅ تم تسجيل شكواك!\n\n📋 ${input.slice(0, 80)}${input.length > 80 ? "..." : ""}\n\n⏳ هيتم مراجعتها. اكتب 5 لمتابعة الحالة.\n\nاكتب 0 للرجوع\n\n[م:menu]`;
    }
    return { message, actions, source: "fallback" };
  }

  // ── Main Menu: numbered or keyword input ──
  const choice = input.replace(/[^\d]/g, "");

  if (choice === "1" || input.includes("أداء") || input.includes("اداء") || input.includes("حلل") || input.includes("تحليل") || input.includes("درج") || input.includes("قوت") || input.includes("قوة") || input.includes("علام")) {
    message = buildPerformanceAnalysis(ctx);
  } else if (choice === "2" || input.includes("خطة") || input.includes("خطه") || input.includes("جدول") || input.includes("اذاكر") || input.includes("أذاكر") || input.includes("مراجعة") || input.includes("النهارده") || input.includes("استعد") || input.includes("اختبار")) {
    message = buildStudyPlan(ctx);
  } else if (choice === "3" || input.includes("تعديل")) {
    const { list, hasQuizzes } = buildQuizList(ctx);
    if (hasQuizzes) {
      message = `✏️ طلب تعديل درجة\n\nكويزاتك:\n${list}\n\n⬇️ اكتب كود الكويز:\n\nاكتب 0 للرجوع\n\n[م:3a]`;
    } else {
      message = `مفيش كويزات محلولة لسه.\n\n${buildMainMenu(ctx)}`;
    }
  } else if (choice === "4" || input.includes("شكوى") || input.includes("شكوه") || input.includes("مشكل") || input.includes("مدرس") || input.includes("صعب")) {
    const courseList = ctx.courses.length > 0
      ? ctx.courses.map((c) => `• ${c.title} (${c.subject})`).join("\n") + "\n\n"
      : "";
    message = `📢 تقديم شكوى\n\n${courseList}⬇️ اكتب تفاصيل شكواك أو المشكلة:\n\nاكتب 0 للرجوع\n\n[م:4a]`;
  } else if (choice === "5" || input.includes("طلبات") || input.includes("حالة")) {
    actions.push({ type: "show_insights", payload: { checkStatus: true } });
    message = `📋 جاري تحميل حالة طلباتك...\n\n[م:5]`;
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
  const contextSummary = summarizeContext(studentContext);
  const cleanHistory = history.slice(-10).map((m) => ({
    role: m.role,
    content: stripFallbackMarkers(m.content),
  })).filter((m) => m.content.length > 0);
  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${contextSummary}` },
    ...cleanHistory,
    { role: "user", content: userMessage },
  ];

  // Try primary first
  let result = await callPrimary(messages);
  if (result) return result;

  // Fallback to backup
  result = await callBackup(messages);
  if (result) return result;

  // Final fallback - menu-based (APIs unavailable or no keys)
  console.log("AI chat: Using fallback (primary key:", !!PRIMARY_API_KEY, ", backup key:", !!BACKUP_API_KEY, ")");
  return fallbackResponse(userMessage, studentContext, history, notifications);
}

export async function analyzeQuizAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  options: Record<string, string>
): Promise<{ wasMisgraded: boolean; reasoning: string; confidence: number }> {
  const prompt = `حلل سؤال الكويز ده:

السؤال: ${question}
خيارات: ${JSON.stringify(options, null, 2)}
إجابة المتعلم: ${studentAnswer}
الإجابة المعتمدة: ${correctAnswer}

هل إجابة المتعلم فعلاً غلط؟ أو ممكن تكون صحيحة من ناحية أخرى؟ ممكن السؤال يكون غامض؟

رد بـ JSON:
{
  "wasMisgraded": boolean,
  "reasoning": "سبب القرار بالعربي",
  "confidence": 0-1
}`;

  const messages: ChatMessage[] = [
    { role: "system", content: "أنت مدرس خبير تحلل أسئلة الكويزات بدقة. ترد بـ JSON فقط." },
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
      // Fall through
    }
  }

  return {
    wasMisgraded: false,
    reasoning: "لم نتمكن من تحليل السؤال تلقائياً، يرجى مراجعة المعلم",
    confidence: 0,
  };
}

export async function generateInsights(
  studentContext: StudentContext
): Promise<Array<{ type: string; category: string; title: string; description: string; confidence: number }>> {
  const ctx = summarizeContext(studentContext);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "أنت محلل تدريبي. حلل بيانات المتعلم واستخرج 3-5 رؤى مهمة (نقاط قوة، نقاط ضعف، توصيات، تحذيرات). رد بـ JSON.",
    },
    {
      role: "user",
      content: `${ctx}\n\nأعطني JSON:\n{ "insights": [{ "type": "weak_area"|"strength"|"recommendation"|"risk_alert", "category": "math"|"physics"|...|"general", "title": "عنوان قصير", "description": "وصف مفصل", "confidence": 0-1 }] }`,
    },
  ];

  const result = await callPrimary(messages);
  if (result?.message) {
    try {
      const match = result.message.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed?.insights && Array.isArray(parsed.insights)) {
        return parsed.insights;
      }
    } catch {
      // Fall through
    }
  }

  // Generate from context
  const insights: Array<{ type: string; category: string; title: string; description: string; confidence: number }> = [];
  for (const weak of studentContext.weakAreas.slice(0, 3)) {
    insights.push({
      type: "weak_area",
      category: weak.subject,
      title: `ضعف في ${weak.topic}`,
      description: `${weak.reason}. ${weak.evidence}`,
      confidence: 0.8,
    });
  }
  if (studentContext.overallStats.averageScore >= 80) {
    insights.push({
      type: "strength",
      category: "general",
      title: "أداء متميز",
      description: `متوسطك ${studentContext.overallStats.averageScore}% - استمر!`,
      confidence: 0.9,
    });
  }
  return insights;
}
