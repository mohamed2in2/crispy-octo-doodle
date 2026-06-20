import { StudyPlanItem } from "@/types";
import { getConfigNumberClamped } from "@/lib/config";
import { resolvePlanProviders, type ResolvedProvider } from "@/lib/ai-provider";

interface AIResponse {
  success: boolean;
  plan?: StudyPlanItem[];
  error?: string;
}

const SYSTEM_PROMPT =
  "You are an expert Egyptian education tutor. Generate a daily study plan as a JSON array only — no prose, no code fences.";

/**
 * Models often wrap JSON in ```json fences or add a sentence of preamble.
 * Pull out the first JSON array so a valid plan isn't discarded over formatting.
 */
function extractJsonArray(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("No JSON array found in AI response");
  }
}

/**
 * Call a configured AI provider (resolved from the DB). The request shape is
 * chosen from the provider's kind. The decrypted key is used here only and is
 * never logged.
 */
async function callProvider(
  provider: ResolvedProvider,
  prompt: string,
  maxTokens: number
): Promise<AIResponse> {
  try {
    const base = provider.baseUrl.replace(/\/+$/, "");
    let planText = "[]";

    if (provider.kind === "anthropic") {
      const res = await fetch(base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": provider.key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { content?: Array<{ text?: string }> };
      planText = data.content?.[0]?.text || "[]";
    } else if (provider.kind === "gemini") {
      const res = await fetch(`${base}/${provider.model}:generateContent?key=${provider.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      planText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    } else {
      // OpenAI-compatible chat completions
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      planText = data.choices?.[0]?.message?.content || "[]";
    }

    const plan = extractJsonArray(planText);
    if (!Array.isArray(plan)) throw new Error("Invalid plan format");
    return { success: true, plan };
  } catch (error) {
    // Never log the key — only the provider name + message.
    console.error(`AI provider "${provider.name}" error:`, error instanceof Error ? error.message : "unknown");
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Generate study plan with primary API, fallback to backup if needed
 */
export async function generateStudyPlan(
  studentProgress: {
    coursesEnrolled: string[];
    videosWatched: number;
    averageQuizScore: number;
    educationalStage: string;
  },
  courseNames: string[]
): Promise<AIResponse> {
  const prompt = `Generate a personalized daily study plan in Arabic for an Egyptian student:
  - Educational Stage: ${studentProgress.educationalStage}
  - Enrolled Courses: ${courseNames.join(", ")}
  - Progress: ${studentProgress.videosWatched} videos watched, ${studentProgress.averageQuizScore}% average score
  
  Return as JSON array with objects containing:
  { topic: string, duration: number (minutes), type: "video" | "quiz" | "reading", priority: "high" | "medium" | "low" }
  
  Format: Only return the JSON array, no additional text.`;

  // Providers (primary → backup), models, base URLs and decrypted keys all come
  // from the DB now — nothing read from .env.
  const maxTokens = await getConfigNumberClamped("ai_max_tokens", 256, 8192);
  const { primary, backup } = await resolvePlanProviders();

  if (primary) {
    const result = await callProvider(primary, prompt, maxTokens);
    if (result.success) return result;
  }

  if (backup) {
    const result = await callProvider(backup, prompt, maxTokens);
    if (result.success) return result;
  }

  // No provider configured, or both failed → graceful static default plan
  console.log("Both AI APIs failed, returning default plan");
  return {
    success: true,
    plan: generateDefaultStudyPlan(studentProgress.educationalStage),
  };
}

/**
 * Generate a default study plan if AI fails
 */
function generateDefaultStudyPlan(stage: string): StudyPlanItem[] {
  return [
    {
      topic: "مراجعة المحاضرات السابقة",
      duration: 30,
      type: "video",
      priority: "high",
    },
    {
      topic: "حل التمارين والأسئلة",
      duration: 45,
      type: "reading",
      priority: "high",
    },
    {
      topic: "اختبار النفس - كويز",
      duration: 20,
      type: "quiz",
      priority: "medium",
    },
    {
      topic: "تعلم موضوع جديد",
      duration: 40,
      type: "video",
      priority: "medium",
    },
    {
      topic: "تطبيقات عملية",
      duration: 30,
      type: "reading",
      priority: "low",
    },
  ];
}

/**
 * Validate and sanitize study plan
 */
export function validateStudyPlan(plan: unknown): StudyPlanItem[] {
  if (!Array.isArray(plan)) return [];

  return plan
    .filter((item): item is StudyPlanItem => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as Partial<StudyPlanItem>).topic === "string" &&
        typeof (item as Partial<StudyPlanItem>).duration === "number" &&
        ["video", "quiz", "reading"].includes((item as Partial<StudyPlanItem>).type as string) &&
        ["high", "medium", "low"].includes((item as Partial<StudyPlanItem>).priority as string)
      );
    })
    .slice(0, 10); // Limit to 10 items
}
