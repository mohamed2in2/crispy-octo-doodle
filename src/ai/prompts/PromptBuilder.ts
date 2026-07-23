import { AIContext, FinalPrompt, PromptOptions } from "../types";
import { ConfigManager } from "../config/AIConfig";

import { AdaptiveDifficulty } from "../brain/AdaptiveDifficulty";
import { LayeredTeacher } from "../brain/LayeredTeacher";
import { SubjectRulesRegistry } from "../subject_rules/SubjectRulesRegistry";

export class PromptBuilder {
  private configManager: ConfigManager;
  private subjectRulesRegistry: SubjectRulesRegistry;

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || ConfigManager.getInstance();
    this.subjectRulesRegistry = SubjectRulesRegistry.getInstance();
  }

  /**
   * Dynamically composes the complete prompt structure.
   */
  public buildPrompt(options: PromptOptions): FinalPrompt {
    const config = this.configManager.getConfig();

    const studentLevel = AdaptiveDifficulty.estimateLevel(
      options.context.quizHistory,
      options.context.currentGrade,
      options.userMessage
    );
    const difficultyInstructions = AdaptiveDifficulty.getPromptInstructions(studentLevel);
    const layeredInstructions = LayeredTeacher.getPromptInstructions();
    const pedagogicalSubjectRules = this.subjectRulesRegistry.getFormattedRules(
      options.context.course.subject
    );

    const identity = `أنت المساعد التعليمي الذكي الخبير لمنصة Code-UP والتعليم المصري.`;
    const teachingStyle = `نمط التدريس المعتمد: ${config.teachingStyle}\n` +
      `التزم بالطول المحدد للإجابات (100 إلى 250 كلمة كحد افتراضي، و 500 كلمة كحد أقصى للمشكلات المعقدة). تجنب إهدار التوكنز في المحادثات الحبيبة أو المقدمات طويلة.`;

    const actionInstructions = options.actionInstructions;
    const subjectRules = `${pedagogicalSubjectRules}\n\n${options.subjectRules}`;
    const contextString = this.formatContext(options.context);
    const userMessage = options.userMessage;

    const fullPrompt = [
      `=== IDENTITY & MISSION ===`,
      identity,
      ``,
      `=== TEACHING STYLE & RESPONSE LENGTH ===`,
      teachingStyle,
      ``,
      `=== ADAPTIVE DIFFICULTY ===`,
      difficultyInstructions,
      ``,
      `=== LAYERED TEACHING METHOD ===`,
      layeredInstructions,
      ``,
      `=== ACTION SPECIFIC INSTRUCTIONS ===`,
      actionInstructions,
      ``,
      `=== SUBJECT PEDAGOGICAL & FORMATTING RULES ===`,
      subjectRules,
      ``,
      `=== PLATFORM & STUDENT CONTEXT ===`,
      contextString,
      ``,
      `=== STUDENT MESSAGE / INPUT ===`,
      userMessage,
    ].join("\n");

    return {
      identity,
      teachingStyle,
      actionInstructions,
      subjectRules,
      contextString,
      userMessage,
      fullPrompt,
    };
  }

  private formatContext(ctx: AIContext): string {
    return [
      `- اسم الطالب: ${ctx.student.name} (المعرف: ${ctx.student.id})`,
      `- المرحلة الدراسية: ${ctx.currentGrade} | المسار: ${ctx.educationalTrack}`,
      `- الكورس الحالي: ${ctx.course.title} (المادة: ${ctx.course.subject})`,
      `- الدرس الحالي: ${ctx.lesson.title} (نسبة الإنجاز: ${ctx.lessonProgress.completionPercentage}%)`,
      `- النقاط التي تحتاج تقوية: ${ctx.weakChapters.join(", ") || "لا توجد نقاط ضعيفة مسجلة"}`,
      `- النقاط القوية: ${ctx.strongChapters.join(", ") || "عام"}`,
      `- الوقت المتاح للدراسة: ${ctx.availableTime} دقيقة`,
      `- إجراء الذكاء الاصطناعي الحالي: ${ctx.currentAction}`,
      `- التاريخ اليوم: ${ctx.currentDate}`,
    ].join("\n");
  }
}
