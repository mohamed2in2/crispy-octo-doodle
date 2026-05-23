import { StudyPlanItem, AIApiResponse } from "@/types";

interface AIResponse {
  success: boolean;
  plan?: StudyPlanItem[];
  error?: string;
}

const PRIMARY_API_KEY = process.env.AI_PRIMARY_API_KEY || "demo-key";
const PRIMARY_API_URL = process.env.AI_PRIMARY_BASE_URL || "https://api.openai.com/v1/chat/completions";

const BACKUP_API_KEY = process.env.AI_BACKUP_API_KEY || "demo-backup-key";
const BACKUP_API_URL = process.env.AI_BACKUP_BASE_URL || "https://api.anthropic.com/v1/messages";

/**
 * Call primary AI API to generate study plan
 */
async function callPrimaryAI(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch(PRIMARY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PRIMARY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert Egyptian education tutor. Generate a daily study plan as JSON array.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Primary API failed: ${response.statusText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const planText = data.choices[0]?.message.content || "[]";

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
 * Call backup AI API as fallback
 */
async function callBackupAI(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch(BACKUP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BACKUP_API_KEY,
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: "You are an expert Egyptian education tutor. Generate a daily study plan as JSON array.",
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Backup API failed: ${response.statusText}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    const planText = data.content[0]?.text || "[]";

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
      topic: "دراسة موضوع جديد",
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
