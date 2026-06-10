import { StudyPlanItem } from "@/types";

interface AIResponse {
  success: boolean;
  plan?: StudyPlanItem[];
  error?: string;
}

const PRIMARY_API_KEY = process.env.AI_PRIMARY_API_KEY || "demo-key";
const PRIMARY_API_URL = process.env.AI_PRIMARY_BASE_URL || "https://api.anthropic.com/v1/messages";

const BACKUP_API_KEY = process.env.AI_BACKUP_API_KEY || "demo-backup-key";
const BACKUP_API_URL = process.env.AI_BACKUP_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models";
const BACKUP_MODEL = process.env.AI_BACKUP_MODEL || "gemini-1.5-flash";

/**
 * Call primary AI API (Claude) to generate study plan
 */
async function callPrimaryAI(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch(PRIMARY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PRIMARY_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: "You are an expert Egyptian education tutor. Generate a daily study plan as JSON array.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Primary API failed: ${response.statusText}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    const planText = data.content[0]?.text || "[]";

    // Parse and validate JSON
    const plan = JSON.parse(planText);
    if (!Array.isArray(plan)) throw new Error("Invalid plan format");

    return { success: true, plan };
  } catch (error) {
    console.error("Primary AI API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Call backup AI API (Gemini) as fallback
 */
async function callBackupAI(prompt: string): Promise<AIResponse> {
  try {
    const systemPrompt = "You are an expert Egyptian education tutor. Generate a daily study plan as JSON array.";
    const combinedPrompt = `${systemPrompt}\n\n${prompt}`;
    
    const url = `${BACKUP_API_URL}/${BACKUP_MODEL}:generateContent?key=${BACKUP_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Backup API failed: ${response.statusText}`);
    }

    const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    const planText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    const plan = JSON.parse(planText);
    if (!Array.isArray(plan)) throw new Error("Invalid plan format");

    return { success: true, plan };
  } catch (error) {
    console.error("Backup AI API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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

  console.log("Attempting to generate study plan via primary API...");
  let result = await callPrimaryAI(prompt);

  if (result.success) {
    console.log("Study plan generated successfully via primary API");
    return result;
  }

  console.log("Primary API failed, attempting backup API...");
  result = await callBackupAI(prompt);

  if (result.success) {
    console.log("Study plan generated successfully via backup API");
    return result;
  }

  // Both APIs failed, return default plan
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
