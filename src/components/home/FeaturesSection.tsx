"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: "محاضرات فيديو عالية الجودة",
    body: "دروس مسجلة من أفضل المعلمين، منظمة في مسارات واضحة تناسب كل صف دراسي.",
    wide: true,
    visual: <VideoMockup />,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "اختبارات ذكية",
    body: "أسئلة تفاعلية تُقيّم مستواك الفعلي وتحدد نقاط ضعفك فوراً.",
    wide: false,
    visual: null,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "مرشد أكاديمي بالذكاء الاصطناعي",
    body: "يحلل تقدمك ويقترح المسار الأفضل والإجابات الفورية على أسئلتك.",
    wide: false,
    visual: null,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "تحليلات أدائك",
    body: "إحصائيات بصرية تُريك نقاط قوتك والمواضيع التي تحتاج مراجعة.",
    wide: true,
    visual: <StatsMockup />,
  },
];

function VideoMockup() {
  return (
    <div className="w-full max-w-[260px] aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-white/8 bg-[#0b0f19] shadow-xl flex flex-col">
      <div className="h-8 bg-[#1e293b]/60 border-b border-white/5 flex items-center px-3 gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="absolute bottom-3 inset-x-3 h-1 rounded-full bg-white/8">
          <div className="w-[38%] h-full rounded-full bg-sky-400/70" />
        </div>
      </div>
    </div>
  );
}

function StatsMockup() {
  const bars = [45, 72, 55, 88, 62, 95, 70];
  return (
    <div className="w-full max-w-[260px] rounded-xl border border-slate-200 dark:border-white/8 bg-[#0b0f19] shadow-xl p-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="w-20 h-2.5 rounded-full bg-white/10" />
        <div className="w-12 h-2 rounded-full bg-sky-400/30" />
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-sky-400/20 border-t border-sky-400/40"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <div className="flex-1 h-1.5 rounded-full bg-white/8" />
          <div className="w-8 h-1.5 rounded-full bg-sky-400/40" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="flex-1 h-1.5 rounded-full bg-white/5" />
          <div className="w-6 h-1.5 rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const reduced = useReducedMotion();

  return (
    <section className="py-20 md:py-32 bg-[#fafbff] dark:bg-[#0b0f19] relative border-t border-slate-200/60 dark:border-white/5 overflow-hidden">
      {/* Subtle ambient top glow — single indigo, no multi-color chaos */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-200/40 dark:bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none" aria-hidden />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section header — no eyebrow chip */}
        <div className="mb-14 md:mb-20">
          <h2 className="text-balance text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            لماذا Code-UP؟
          </h2>
          <p className="text-slate-500 dark:text-white/45 text-base md:text-lg max-w-xl font-medium leading-relaxed text-pretty">
            بنيناها لطلاب الثانوية المصرية — كل ميزة تخدم هدفاً واحداً: تسهيل المذاكرة.
          </p>
        </div>

        {/* Feature grid — asymmetric, not identical cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Wide card — Video */}
          <FeatureCard wide reduced={!!reduced}>
            <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10 h-full">
              <div className="flex-1 flex flex-col justify-between h-full gap-6">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/50 dark:bg-white/5 dark:border-white/8 flex items-center justify-center text-indigo-500 dark:text-sky-400 mb-4">
                    {FEATURES[0].icon}
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-xl mb-2 tracking-tight">{FEATURES[0].title}</h3>
                  <p className="text-slate-500 dark:text-white/45 text-sm leading-relaxed">{FEATURES[0].body}</p>
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-end shrink-0">
                <VideoMockup />
              </div>
            </div>
          </FeatureCard>

          {/* Narrow card — Quizzes */}
          <FeatureCard reduced={!!reduced}>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/50 dark:bg-white/5 dark:border-white/8 flex items-center justify-center text-indigo-500 dark:text-sky-400 mb-4">
              {FEATURES[1].icon}
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2 tracking-tight">{FEATURES[1].title}</h3>
            <p className="text-slate-500 dark:text-white/45 text-sm leading-relaxed">{FEATURES[1].body}</p>
            {/* Decorative quiz row */}
            <div className="mt-6 space-y-2">
              {["أ", "ب", "ج", "د"].map((opt, i) => (
                <div
                  key={opt}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                    i === 1
                      ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-sky-400/40 dark:bg-sky-400/8 dark:text-sky-300"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/6 dark:bg-white/3 dark:text-white/30"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${i === 1 ? "border-indigo-400 text-indigo-500 dark:border-sky-400/60 dark:text-sky-400" : "border-slate-300 text-slate-400 dark:border-white/15 dark:text-white/30"}`}>{opt}</span>
                  <div className={`h-1.5 rounded-full ${i === 1 ? "w-24 bg-indigo-300 dark:bg-sky-400/40" : "w-16 bg-slate-200 dark:bg-white/8"}`} />
                  {i === 1 && <svg className="w-4 h-4 text-indigo-500 dark:text-sky-400 shrink-0 mr-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              ))}
            </div>
          </FeatureCard>

          {/* Narrow card — AI */}
          <FeatureCard reduced={!!reduced}>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/50 dark:bg-white/5 dark:border-white/8 flex items-center justify-center text-indigo-500 dark:text-sky-400 mb-4">
              {FEATURES[2].icon}
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-2 tracking-tight">{FEATURES[2].title}</h3>
            <p className="text-slate-500 dark:text-white/45 text-sm leading-relaxed">{FEATURES[2].body}</p>
            {/* Decorative chat */}
            <div className="mt-6 space-y-2.5">
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tl-sm bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-sky-500/20 dark:border-sky-400/20 dark:text-sky-200 text-xs leading-relaxed">
                  ما هي معادلة كيرشهوف؟
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm bg-slate-100 border border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/8 dark:text-white/60 text-xs leading-relaxed">
                  مجموع التيارات الداخلة يساوي مجموع التيارات الخارجة عند أي عقدة...
                </div>
              </div>
            </div>
          </FeatureCard>

          {/* Wide card — Stats */}
          <FeatureCard wide reduced={!!reduced} className="md:col-start-1">
            <div className="flex flex-col md:flex-row items-start gap-6 md:gap-10 h-full">
              <div className="flex-1 flex flex-col justify-between h-full gap-6">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/50 dark:bg-white/5 dark:border-white/8 flex items-center justify-center text-indigo-500 dark:text-sky-400 mb-4">
                    {FEATURES[3].icon}
                  </div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-xl mb-2 tracking-tight">{FEATURES[3].title}</h3>
                  <p className="text-slate-500 dark:text-white/45 text-sm leading-relaxed">{FEATURES[3].body}</p>
                </div>
              </div>
              <div className="flex items-center justify-center md:justify-end shrink-0">
                <StatsMockup />
              </div>
            </div>
          </FeatureCard>

        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  children,
  wide = false,
  reduced,
  className = "",
}: {
  children: React.ReactNode;
  wide?: boolean;
  reduced: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`
        relative rounded-2xl border border-slate-200 bg-white dark:border-white/6 dark:bg-[#111827]/60 p-6 md:p-8
        hover:border-indigo-200 dark:hover:border-white/12 transition-all duration-200 shadow-sm hover:shadow-md dark:shadow-none
        ${wide ? "md:col-span-2" : "md:col-span-1"}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
