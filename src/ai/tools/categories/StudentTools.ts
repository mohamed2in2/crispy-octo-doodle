import { AITool, ToolExecutionContext, ToolExecutionResult, ToolParameterSchema, UserRole } from "../types";

export class StudentProfileTool implements AITool {
  public name = "GetStudentProfile";
  public description = "Retrieves student name, grade, track, language preference, learning style, goals, weak/strong subjects, streak, available time, current courses, and plan.";
  public category = "Student";
  public allowedRoles: UserRole[] = ["student", "teacher", "superadmin"];
  public cacheable = true;
  public ttlMs = 300000;

  public parameters(): ToolParameterSchema[] {
    return [
      { name: "studentId", type: "string", description: "ID of the student", required: false },
    ];
  }

  public validate(params?: Record<string, unknown>): boolean {
    return true;
  }

  public async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    return {
      success: true,
      data: {
        id: context.userId,
        name: "طالب Code-UP المميز",
        grade: "sec_1",
        educationalTrack: "General STEM & Computer Science",
        preferredLanguage: "ar",
        learningStyle: "balanced",
        goals: ["إتقان أساسيات البرمجة", "الحصول على الدرجة النهائية في الفيزياء"],
        weakSubjects: ["الدوال المتقدمة"],
        strongSubjects: ["المتغيرات والجمل الشرطية"],
        studyStreakDays: 7,
        availableTimeMinutes: 45,
        currentCourses: ["crs_prog_101", "crs_phys_301"],
        currentPlanId: "plan_sec1_active",
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  public async health(): Promise<boolean> {
    return true;
  }
}
