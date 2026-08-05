/**
 * AI Long Explanation Trigger Words & Phrases (~300 items)
 *
 * Used by the AI Engine to decide if a student requires a detailed/layered explanation.
 * Default behavior without these triggers is a ultra-short, direct, and concise answer.
 */

export const AI_LONG_EXPLANATION_TRIGGERS: readonly string[] = [
  // ── Core Explanation & Teaching Terms (Arabic) ─────────────────────────
  "اشرح", "اشرحلي", "اشرح لي", "شرح", "مشروح", "شرح مفصل", "شرح كامل", "شرح بسيط",
  "فهمني", "فهمية", "تفهم", "تفهمني", "فهم", "توضيح", "وضح", "وضحلي", "وضح لي",
  "تبيين", "بيّن", "بينلي", "فسر", "فسرلي", "تفسير", "فسر لي", "تفصيل", "بالتفصيل",
  "تفصيلي", "شرح تفصيلي", "شرح بالتفصيل", "خطوة بخطوة", "خطوه بخطوه", "بالخطوات",

  // ── Question Words Requesting Deep Rationale (Arabic) ────────────────
  "ليه", "لماذا", "علل", "سبب", "السبب", "ما سبب", "ما السبب", "ازاي", "إزاي",
  "كيف", "كيفية", "طريقة", "شرح طريقة", "طريقه", "ازاي تتعمل", "ازاي اقدر",
  "كيف يمكن", "كيف استطيع", "كيف نعمل", "معنى", "يعني ايه", "يعني إيه", "مفهوم",
  "قصده ايه", "ما المقصود", "ما معني", "ما معنى", "ما المراد",

  // ── Examples & Applications (Arabic) ─────────────────────────────────
  "مثال", "أمثلة", "امثلة", "اعطني مثال", "عايز مثال", "عايز امثله", "هات مثال",
  "ضرب مثال", "تطبيق", "تطبيقات", "تمرين", "مسألة", "مساله", "حل مع الشرح",
  "خطوات الحل", "طريقة الحل", "ازاي احل", "ازاي بنحل", "شرح المسألة",

  // ── Deep Dive & Comparison (Arabic) ─────────────────────────────────
  "الفرق بين", "ما الفرق", "مقارنة", "قارن بين", "ايه الفرق", "إيه الفرق",
  "الفرق", "موازنة", "اختلاف", "وجه الشبه", "الفروقات", "مميزات وعيوب",
  "خصائص", "مبادئ", "قوانين", "قاعدة", "قواعد", "أساسيات", "اصل", "أصل",

  // ── Confusion & Emotional Signals for Help (Arabic) ──────────────────
  "مش فاهم", "مش فاهمة", "مانيش فاهم", "لم أفهم", "غير مفهوم", "صعبة", "صعب",
  "تلخبطت", "متلخبط", "محتار", "مش واضح", "غموض", "معقدة", "معقد", "حاسس بصعوبة",
  "ساعدني افهم", "عيد الشرح", "اعيد", "اعادة شرح", "كرر", "بسطها", "بسطلي",
  "بسط لي", "بالراحة", "على مهلك",

  // ── Core Explanation & Teaching Terms (English) ──────────────────────
  "explain", "explain to me", "explanation", "detailed explanation", "teach me",
  "break down", "break it down", "break down step by step", "step by step",
  "elaborate", "elaborate on", "clarify", "clarification", "describe",
  "description", "illustrate", "illustration", "walkthrough", "walk me through",

  // ── Question Words & Deep Rationale (English) ────────────────────────
  "why", "why is", "why does", "why do", "how", "how does", "how to",
  "how can i", "how do we", "what is the reason", "reason behind", "concept", "meaning",
  "what does it mean", "what is meant by", "define", "definition",

  // ── Examples & Applications (English) ────────────────────────────────
  "example", "examples", "give me an example", "give an example", "sample",
  "use case", "application", "how to solve", "solution steps", "step by step guide",
  "exercise", "practice problem", "demonstrate", "demo",

  // ── Deep Dive & Comparison (English) ────────────────────────────────
  "difference between", "compare", "comparison", "contrast", "pros and cons",
  "advantages and disadvantages", "in depth", "deep dive", "under the hood",
  "how it works", "working mechanism", "behind the scenes", "fundamentals",

  // ── Extended Trigger Variants (Arabic & English 300+ entries) ───────
  "فهموهالي", "فهموني", "شرحك", "اشرحلي الموضوع", "عاوز افهم", "عايز افهم",
  "نفسي افهم", "شرح بسيط وسهل", "شرح للمبتدئين", "من الصفر", "من البدايه",
  "من البداية", "تدرج", "بالتفصيل الملل", "استفاضة", "في إيجاز وتفصيل",
  "ما هي خطوات", "ماهي الخطوات", "ما المسار", "ازاي اتعلمها", "اشرح الدرس",
  "شرح كود", "حلل", "تحليل", "استنتج", "كيف تم", "لماذا تم", "علي علل",
  "فند", "صيغة الشرح", "اصل المفهوم", "لماذا نستخدم", "ليه بنستخدم",
  "كيف يشتغل", "ازاي شغال", "مبدأ عمل", "طريقة العمل", "آلية العمل",
  "آلية", "فكرة عمل", "فكره عمل", "شغال ازاي", "بيشتغل ازاي", "ليه اتعملت",
  "ليه بنحتاج", "فوائد", "استخدامات", "دواعي", "طريقة الكتابة", "بنية",
  "هيكلية", "تكوين", "مكونات", "تركيب", "عناصر", "مراحل", "خطوات تتبع",

  "guide me", "deep explanation", "show me how", "show example", "code walk-through",
  "explain code", "analyze", "analysis", "how it works under the hood",
  "what makes it", "why do we use", "when to use", "best practices",
  "core concepts", "key differences", "overview with example", "simplify this",
  "make it simple", "make it clear", "explain like i am 5", "eli5",
  "layman terms", "plain english", "easy way to understand", "visual explanation",
  "diagram explanation", "troubleshoot step by step", "derivation", "proof",
  "prove that", "derive", "logic behind", "rationale", "justification",
  "why so", "how so", "how come", "what is the cause", "root cause",

  "ممكن مثال", "ممكن تشرحلي", "يا ريت تشرحلي", "لو سمحت اشرح", "بالله اشرح",
  "ممكن توضيح", "لو سمحت وضح", "ممكن تفهمني", "مش فاهم الكود", "مش فاهم المسألة",
  "الكلام مش واضح", "ممكن تبسيط", "بسطها اكتر", "بسطها أكثر", "مش استوعبت",
  "ما استوعبت", "ما فهمت", "ما وضحت", "غير واضحة", "محتاج توضيح", "محتاج شرح",
  "أحتاج شرح", "اريد شرح", "أريد تفصيل", "ممكن تفاصيل", "شرح الكود دا",
  "شرح السطر ده", "ليه كتبنا كدا", "ليه عملنا كدا", "ليه اخترنا ده",
  "شرح الإجابة", "تفسير الإجابة", "لماذا الإجابة", "سبب اختيار",

  "can you explain", "please explain", "could you clarify", "i don't understand",
  "i am confused", "not clear", "still unclear", "need clarification",
  "need explanation", "explain line by line", "line by line", "step by step explanation",
  "why this line", "why did we write", "why did we choose", "explain answer",
  "why is this correct", "why is this wrong", "reason for this",

  "تفسير منطقي", "توجيه", "إرشادات تفصيلية", "شرح الجوانب", "تغطية كاملة",
  "شرح هادئ", "مستفيض", "استفاضه", "شرح عميق", "إضاءة على", "تسليط الضوء",
  "توضيح الفكرة", "شرح المفهوم الأساسي", "تعمق", "تبسيط المفاهيم",

  "comprehensive guide", "in-depth explanation", "detailed breakdown", "full explanation",
  "clear explanation", "simple breakdown", "easy explanation", "complete walkthrough",
  "thorough explanation", "deep dive into", "conceptual explanation"
] as const;

/**
 * Normalizes input text for fast matching (lowercase, strip Arabic diacritics/kashida).
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, "") // strip harakat & kashida
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

/**
 * Checks if a user message contains any trigger word/phrase for a long explanation.
 */
export function isLongExplanationTriggered(message: string): boolean {
  if (!message || !message.trim()) return false;
  
  const normalized = normalizeText(message);
  
  for (const trigger of AI_LONG_EXPLANATION_TRIGGERS) {
    const normTrigger = normalizeText(trigger);
    if (normalized.includes(normTrigger)) {
      return true;
    }
  }

  return false;
}
