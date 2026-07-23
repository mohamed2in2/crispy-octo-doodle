import { AITool, ToolExecutionContext, ToolExecutionResult, ToolParameterSchema, UserRole } from "../types";

export class TodayPlanTool implements AITool {
  public name = "TodayPlan";
  public description = "Retrieves today's study plan items, target duration, and completed tasks.";
  public category = "StudyPlan";
  public allowedRoles: UserRole[] = ["student", "teacher", "superadmin"];
  public cacheable = true;

  public parameters(): ToolParameterSchema[] { return []; }
  public validate(): boolean { return true; }

  public async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    return {
      success: true,
      data: {
        planDate: new Date().toISOString().split("T")[0],
        items: [
          { task: "مشاهدة فيديو المتغيرات", durationMinutes: 20, completed: true },
          { task: "حل الكويز التفاعلي رقم 1", durationMinutes: 15, completed: false },
        ],
        totalMinutes: 35,
      },
      executionTimeMs: 5,
    };
  }

  public async health(): Promise<boolean> { return true; }
}
