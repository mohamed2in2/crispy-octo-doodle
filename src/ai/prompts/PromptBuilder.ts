import { AIContext, FinalPrompt, PromptOptions } from "../types";
import { ConfigManager } from "../config/AIConfig";

import { AdaptiveDifficulty } from "../brain/AdaptiveDifficulty";
import { LayeredTeacher } from "../brain/LayeredTeacher";
import { SubjectRulesRegistry } from "../subject_rules/SubjectRulesRegistry";

import { isLongExplanationTriggered } from "../config/explanation-triggers";

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
    const pedagogicalSubjectRules = this.subjectRulesRegistry.getFormattedRules(
      options.context.course.subject
    );

    const isDetailedExplanationRequested =
      (options.context.currentAction as string) === "TUTOR_LESSON" ||
      isLongExplanationTriggered(options.userMessage);

    const layeredInstructions = isDetailedExplanationRequested
      ? LayeredTeacher.getPromptInstructions()
      : `[ULTRA-CONCISE MODE — SAVE TIME & TOKENS]:
1. Internal Analysis: Quietly determine: (a) Student's exact need, (b) Student's emotional state, (c) Whether a direct short answer suffices.
2. Ultra-Short Direct Answer: Give the shortest correct answer possible (1-2 sentences or exact result).
3. Zero Fluff: NO greetings, NO intro/outro, NO repeating the question, NO motivational paragraphs. Answer immediately and directly.`;

    const identity = `أنت المساعد التعليمي الذكي الخبير لمنصة Code-UP والتعليم المصري.`;
    const teachingStyle = isDetailedExplanationRequested
      ? `نمط التدريس المعتمد: ${config.teachingStyle}\nالتزم بالطول المناسب للسؤال.`
      : `نمط التدريس: مباشر جداً ومختصر للغاية (إجابة مباشرة بدون مقدمات أو حشو).`;

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
      `=== RESPONSE GUIDELINES ===`,
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
