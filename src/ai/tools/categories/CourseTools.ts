import { AITool, ToolExecutionContext, ToolExecutionResult, ToolParameterSchema, UserRole } from "../types";

export class GetCurrentCourseTool implements AITool {
  public name = "GetCurrentCourse";
  public description = "Gets current active course details, subject, and progress.";
  public category = "Course";
  public allowedRoles: UserRole[] = ["student", "teacher", "superadmin", "anonymous"];
  public cacheable = true;

  public parameters(): ToolParameterSchema[] {
    return [{ name: "courseId", type: "string", description: "Course ID", required: false }];
  }

  public validate(): boolean { return true; }

  public async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    return {
      success: true,
      data: {
        id: context.courseId || "crs_prog_101",
        title: "أساسيات البرمجة والتفكير المنطقي",
        subject: context.subject || "برمجه عملي",
        teacherName: "م. أحمد علي",
        progressPercentage: 68,
        totalLessons: 12,
        completedLessonsCount: 8,
      },
      executionTimeMs: 5,
    };
  }

  public async health(): Promise<boolean> { return true; }
}

export class GetLessonTool implements AITool {
  public name = "GetLesson";
  public description = "Retrieves lesson details, objectives, and resources.";
  public category = "Course";
  public allowedRoles: UserRole[] = ["student", "teacher", "superadmin", "anonymous"];
  public cacheable = true;

  public parameters(): ToolParameterSchema[] {
    return [{ name: "lessonId", type: "string", description: "Lesson ID", required: false }];
  }

  public validate(): boolean { return true; }

  public async execute(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    return {
      success: true,
      data: {
        id: context.lessonId || "lsn_101",
        title: "المتغيرات وأنواع البيانات",
        order: 1,
        objectives: ["فهم مفهوم المتغير في الذاكرة", "التمييز بين let و const"],
        resources: ["فيديو الشرح", "ملف PDF المرفق", "كويز تفاعلي"],
        estimatedStudyMinutes: 25,
      },
      executionTimeMs: 4,
    };
  }

  public async health(): Promise<boolean> { return true; }
}
