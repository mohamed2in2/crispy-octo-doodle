import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

async function callOpenAI(messages: { role: string; content: string }[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(messages: { role: string; content: string }[]) {
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

function generateFallbackPlan(courses: string[]): string {
  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `## خطة الدراسة اليومية - ${today}

مرحباً! إليك خطة دراسية مقترحة بناءً على كورساتك:

${courses.length > 0 ? courses.map((c, i) => `**${i + 1}. ${c}**
- مراجعة المحاضرات السابقة: 30 دقيقة
- دراسة محتوى جديد: 45 دقيقة  
- حل التمارين والاختبارات: 15 دقيقة`).join("\n\n") : "لم تنضم إلى أي كورس بعد. ابدأ بتسجيل كود الوصول في صفحة الكورسات."}

**نصائح للدراسة الفعالة:**
- خذ استراحة 10 دقائق كل ساعة
- راجع الملاحظات قبل النوم
- حل الاختبارات لتعزيز الفهم`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { messages, courses } = await req.json();

  const systemPrompt = `أنت مساعد دراسي ذكي لمنصة تعليمية مصرية. مهمتك مساعدة الطلاب في وضع خطط دراسية يومية.
الكورسات المسجل فيها الطالب: ${courses?.join(", ") || "لا يوجد كورسات"}
أجب باللغة العربية دائماً. كن مفيداً وداعماً.`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...(messages || []),
  ];

  let reply: string;

  // Try primary API (OpenAI), fallback to Gemini, then static fallback
  try {
    if (process.env.OPENAI_API_KEY) {
      reply = await callOpenAI(formattedMessages);
    } else {
      throw new Error("No OpenAI key");
    }
  } catch {
    try {
      if (process.env.GEMINI_API_KEY) {
        reply = await callGemini(formattedMessages);
      } else {
        throw new Error("No Gemini key");
      }
    } catch {
      reply = generateFallbackPlan(courses || []);
    }
  }

  return NextResponse.json({ reply });
}
