"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function VideoMockup() {
  return (
    <div
      className="w-full max-w-full sm:max-w-[260px] aspect-video rounded-xl overflow-hidden shadow-xl flex flex-col"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="h-8 flex items-center px-3 gap-1.5 shrink-0"
        style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="w-2 h-2 rounded-full" style={{ background: "var(--danger-soft)" }} />
        <div className="w-2 h-2 rounded-full" style={{ background: "var(--gold-soft)" }} />
        <div className="w-2 h-2 rounded-full" style={{ background: "var(--brand-soft)" }} />
      </div>
      <div className="flex-1 flex items-center justify-center relative" style={{ background: "var(--bg)" }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "var(--brand-soft)", border: "1px solid var(--brand)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="var(--brand)" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <polygon points="5,3 19,12 5,21" fill="var(--brand)" />
          </svg>
        </div>
        <div className="absolute bottom-3 inset-x-3 h-1 rounded-full" style={{ background: "var(--border)" }}>
          <div className="w-[38%] h-full rounded-full" style={{ background: "var(--brand)" }} />
        </div>
      </div>
    </div>
  );
}

function StatsMockup() {
  const bars = [45, 72, 55, 88, 62, 95, 70];
  return (
    <div
      className="w-full max-w-full sm:max-w-[260px] rounded-xl shadow-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex justify-between items-center">
        <div className="w-20 h-2.5 rounded-full" style={{ background: "var(--border)" }} />
        <div className="w-12 h-2 rounded-full" style={{ background: "var(--brand-soft)" }} />
      </div>
      <div className="flex items-end gap-1.5 h-20">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${h}%`, background: "var(--brand-soft)", borderTop: "1px solid var(--brand)" }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--brand)" }} />
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--border)" }} />
          <div className="w-8 h-1.5 rounded-full" style={{ background: "var(--brand-soft)" }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--border-strong)" }} />
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--bg-2)" }} />
          <div className="w-6 h-1.5 rounded-full" style={{ background: "var(--bg-2)" }} />
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: "محاضرات فيديو عالية الجودة",
    body:  "دروس مسجلة من أفضل المعلمين، منظمة في مسارات واضحة تناسب كل صف دراسي.",
    wide:  true,
    visual: <VideoMockup />,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: "اختبارات ذكية",
    body:  "أسئلة تفاعلية تُقيّم مستواك الفعلي وتحدد نقاط ضعفك فوراً.",
    wide:  false,
    visual: null,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "مرشد أكاديمي بالذكاء الاصطناعي",
    body:  "يحلل تقدمك ويقترح المسار الأفضل والإجابات الفورية على أسئلتك.",
    wide:  false,
    visual: null,
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "تحليلات أدائك",
    body:  "إحصائيات بصرية تُريك نقاط قوتك والمواضيع التي تحتاج مراجعة.",
    wide:  true,
    visual: <StatsMockup />,
  },
];

export function FeaturesSection() {
  const reduced = useReducedMotion();

  return (
    <section
      className="py-20 md:py-32 relative border-t overflow-hidden"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none"
        aria-hidden
        style={{ background: "rgba(14,110,98,.08)" }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-14 md:mb-20">
          <h2
            className="text-balance text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4"
            style={{ color: "var(--ink)", fontFamily: "var(--font-head)" }}
          >
            لماذا Code-UP؟
          </h2>
          <p className="text-base md:text-lg max-w-xl font-medium leading-relaxed text-pretty" style={{ color: "var(--ink-2)" }}>
            بنيناها لطلاب الثانوية المصرية — كل ميزة تخدم هدفاً واحداً: تسهيل المذاكرة.
          </p>
        </div>

        {/* 3-col grid — row1: [Video wide 2/3] [Quiz 1/3]  row2: [AI 1/3] [Stats wide 2/3] */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Wide — Video */}
          <FeatureCard wide reduced={!!reduced}>
            <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-10 h-full">
              <div className="flex-1 flex flex-col justify-between h-full gap-6">
                <div>
                  <IconBox>{FEATURES[0].icon}</IconBox>
                  <h3 className="font-bold text-xl mb-2 tracking-tight" style={{ color: "var(--ink)" }}>{FEATURES[0].title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{FEATURES[0].body}</p>
                </div>
              </div>
              <div className="flex items-center justify-center lg:justify-end shrink-0 w-full lg:w-auto">
                <VideoMockup />
              </div>
            </div>
          </FeatureCard>

          {/* Narrow — Quizzes */}
          <FeatureCard reduced={!!reduced}>
            <IconBox>{FEATURES[1].icon}</IconBox>
            <h3 className="font-bold text-lg mb-2 tracking-tight" style={{ color: "var(--ink)" }}>{FEATURES[1].title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{FEATURES[1].body}</p>
            <div className="mt-6 space-y-2">
              {["أ", "ب", "ج", "د"].map((opt, i) => (
                <div
                  key={opt}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border text-sm"
                  style={{
                    border: `1px solid ${i === 1 ? "var(--brand)" : "var(--border)"}`,
                    background: i === 1 ? "var(--brand-soft)" : "var(--surface-2)",
                    color: i === 1 ? "var(--brand)" : "var(--ink-3)",
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ borderColor: i === 1 ? "var(--brand)" : "var(--border)", color: i === 1 ? "var(--brand)" : "var(--ink-3)" }}
                  >{opt}</span>
                  <div className="h-1.5 rounded-full" style={{ width: i === 1 ? 96 : 64, background: i === 1 ? "var(--brand)" : "var(--border)" }} />
                  {i === 1 && (
                    <svg className="w-4 h-4 mr-auto" fill="none" viewBox="0 0 24 24" stroke="var(--brand)" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </FeatureCard>

          {/* Narrow — AI */}
          <FeatureCard reduced={!!reduced}>
            <IconBox>{FEATURES[2].icon}</IconBox>
            <h3 className="font-bold text-lg mb-2 tracking-tight" style={{ color: "var(--ink)" }}>{FEATURES[2].title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{FEATURES[2].body}</p>
            <div className="mt-6 space-y-2.5">
              <div className="flex justify-end">
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tl-sm text-xs leading-relaxed"
                  style={{ background: "var(--brand-soft)", border: "1px solid var(--brand)", color: "var(--brand)" }}
                >
                  ما هي معادلة كيرشهوف؟
                </div>
              </div>
              <div className="flex justify-start">
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-sm text-xs leading-relaxed"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--ink-2)" }}
                >
                  مجموع التيارات الداخلة يساوي مجموع التيارات الخارجة عند أي عقدة...
                </div>
              </div>
            </div>
          </FeatureCard>

          {/* Wide — Stats (NO col-start-1 so it fills cols 2-3 of row 2) */}
          <FeatureCard wide reduced={!!reduced}>
            <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-10 h-full">
              <div className="flex-1 flex flex-col justify-between h-full gap-6">
                <div>
                  <IconBox>{FEATURES[3].icon}</IconBox>
                  <h3 className="font-bold text-xl mb-2 tracking-tight" style={{ color: "var(--ink)" }}>{FEATURES[3].title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{FEATURES[3].body}</p>
                </div>
              </div>
              <div className="flex items-center justify-center lg:justify-end shrink-0 w-full lg:w-auto">
                <StatsMockup />
              </div>
            </div>
          </FeatureCard>

        </div>
      </div>
    </section>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
      style={{ background: "var(--brand-soft)", border: "1px solid var(--brand)", color: "var(--brand)" }}
    >
      {children}
    </div>
  );
}

function FeatureCard({
  children, wide = false, reduced, className = "",
}: {
  children: React.ReactNode; wide?: boolean; reduced: boolean; className?: string;
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`relative rounded-2xl p-6 md:p-8 transition-all duration-200 ${wide ? "md:col-span-2" : "md:col-span-1"} ${className}`}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </motion.div>
  );
}
