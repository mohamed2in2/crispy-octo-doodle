import { BaseProvider } from "./BaseProvider";
import { GenerateOptions, GenerateResult, ProviderCapabilities } from "../types";

export class MockProvider extends BaseProvider {
  public id = "mock";
  public name = "Code-UP Mock Educational AI Provider";
  public capabilities: ProviderCapabilities = {
    supportsStreaming: true,
    supportsEmbeddings: true,
    supportsVision: false,
    maxContextTokens: 128000,
  };

  public async generate(options: GenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();
    const promptText = this.extractPromptText(options.prompt);
    const inputTokens = this.estimateTokens(promptText);

    let outputText = `### الاستجابة التعليمية الذكية\n\n` +
      `إليك التوجيه الدراسي المطلوب للمفهوم البرمجي:\n\n` +
      `- **المفهوم الأساسي**: فهم الخطوات البرمجية والتسلسل المنطقي.\n` +
      `- **الشرح والتحليل**: تقسيم الموضوعات المعقدة إلى موديولات بسيطة.\n` +
      `- **خطة العمل**: مراجعة مخرجات الدرس ثم التطبيق العملي للتمارين.`;

    // Detect action intent from prompt text to craft realistic educational responses
    if (promptText.includes("[ACTION: EXPLAIN]") || promptText.includes("EXPLAIN")) {
      outputText = `### الشرح التعليمي المبسط\n\n` +
        `المفهوم المطلوب يتعلق بالأساسيات البرمجية والتعليمية.\n\n` +
        `#### النقاط الرئيسية:\n` +
        `1. **التعريف الأول**: الهيكل العام للموضوع وكيفية عمله.\n` +
        `2. **الآلية الداخليّة**: الخطوات العملية التي يتم تنفيذها تتابعياً.\n` +
        `3. **تطبيق عملي**: مثال توضيحي يساعد على ترسيخ الفكرة.\n\n` +
        `*نصيحة دراسية*: قم بتطبيق الكود بنفسك للحصول على أقصى فائدة.`;
    } else if (promptText.includes("[ACTION: SOLVE]") || promptText.includes("SOLVE")) {
      outputText = `### الحل التوضيحي بالخطوات\n\n` +
        `**الخطوة 1: تحليل المسألة**\nتحديد المعطيات والمطلوب بدقة.\n\n` +
        `**الخطوة 2: تطبيق القانون/الخوارزمية**\nنستخدم المعطيات للوصول إلى النتيجة الصحيحة.\n\n` +
        `**النتيجة النهائية**:\n\`\`\`javascript\n// النتيجة المعتمدة\nconst solution = true;\n\`\`\``;
    } else if (promptText.includes("[ACTION: QUIZ]") || promptText.includes("QUIZ")) {
      outputText = `### بطاقة بطاقات الاختبار السريع\n\n` +
        `**سؤال 1**: ما هو الهدف الرئيسي من المتغيرات في البرمجة؟\n` +
        `- [ ] أ) تخزين البيانات لاستخدامها لاحقاً\n` +
        `- [ ] ب) طباعة الصفحات\n` +
        `- [ ] ج) إغلاق المتصفح\n` +
        `- [ ] د) تسريع المعالج\n\n` +
        `*الإجابة الصحيحة*: أ`;
    } else if (promptText.includes("[ACTION: FLASHCARDS]") || promptText.includes("FLASHCARDS")) {
      outputText = `### بطاقات الاستذكار السريع (Flashcards)\n\n` +
        `| الوجه الأول (المفهوم) | الوجه الثاني (الشرح) |\n` +
        `| --- | --- |\n` +
        `| Variable | مكان في الذاكرة لتخزين قيمة قابلة للتغيير |\n` +
        `| Function | كتلة كود ينفذ مهمة محددة عند استدعائه |`;
    } else if (promptText.includes("[ACTION: SUMMARY]") || promptText.includes("SUMMARY")) {
      outputText = `### ملخص الدرس الأكاديمي\n\n` +
        `- **النقطة الأولى**: استعراض مفاهيم الدرس الأساسية وتحليل البنية النصية.\n` +
        `- **النقطة الثانية**: التطبيق العلمي للأوامر البرمجية الهامة.\n` +
        `- **الملخص**: مراجعة دورية تضمن تثبيت المعلومات قبل الانتقال للدرس التالي.`;
    } else if (promptText.includes("[ACTION: PLAN]") || promptText.includes("PLAN")) {
      outputText = `### خطة الدراسة الشخصية\n\n` +
        `1. **الجلسة الأولى (20 دقيقة)**: مشاهدة فيديو الدرس والتركيز على النقاط المفتاحية.\n` +
        `2. **الجلسة الثانية (15 دقيقة)**: حل الاختبارات والتمارين التفاعلية.\n` +
        `3. **الجلسة الثالثة (10 دقائق)**: مراجعة الملخص وبطاقات الذاكرة.`;
    } else if (promptText.includes("[ACTION: MOTIVATE]") || promptText.includes("MOTIVATE")) {
      outputText = `### تشجيع ودعم الطالب\n\n` +
        `أنت تسير في الطريق الصحيح للتميز الأكاديمي والبرمجي! التحديات اليوم هي مهارات الغد.\n` +
        `واصل الممارسة والتعلم خطوة بخطوة، فالإنجاز الكبير يتكون من خطوات صغيرة منتظمة.`;
    } else if (promptText.includes("[ACTION: PARENT_REPORT]") || promptText.includes("PARENT_REPORT")) {
      outputText = `### تقرير ولي الأمر الدوري\n\n` +
        `نحيطكم علماً بأن الطالب يقدم أداءً ممتازاً في كورس البرمجة، حيث أتم نسبة كبيرة من الدروس والتسليمات.\n` +
        `نوصي بالمتابعة وتشجيع الطالب على تخصيص 30 دقيقة يومياً للمراجعة التفاعلية.`;
    }

    const outputTokens = this.estimateTokens(outputText);
    const latencyMs = Date.now() - startTime;

    return {
      text: outputText,
      providerId: this.id,
      providerName: this.name,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      latencyMs,
      finishReason: "stop",
    };
  }

  public override async healthCheck(): Promise<boolean> {
    return true;
  }
}
