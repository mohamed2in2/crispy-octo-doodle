"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { SkeletonCard } from "@/components/ui/Skeleton";

const STAGES = [
  { value: "all", label: "الكل (جميع المراحل)" },
  { value: "sec_1", label: "الصف الأول الثانوي" },
  { value: "sec_2", label: "الصف الثاني الثانوي" },
  { value: "sec_3", label: "الصف الثالث الثانوي" },
  { value: "prep_1", label: "الصف الأول الإعدادي" },
  { value: "prep_2", label: "الصف الثاني الإعدادي" },
  { value: "prep_3", label: "الصف الثالث الإعدادي" },
  { value: "primary_6", label: "الصف السادس الابتدائي" },
];

const STAGE_LABELS: Record<string, string> = {
  primary_6: "الصف السادس الابتدائي",
  prep_1: "الصف الأول الإعدادي",
  prep_2: "الصف الثاني الإعدادي",
  prep_3: "الصف الثالث الإعدادي",
  sec_1: "الصف الأول الثانوي",
  sec_2: "الصف الثاني الثانوي",
  sec_3: "الصف الثالث الثانوي",
};

const DEFAULT_PLAN_FEATURES = [
  "تغطية منهجية متكاملة لجميع دروس الشهر",
  "مشاريع وتطبيقات عمليّة لتثبيت الشرح",
  "كويزات تقييمية وتدريبات واختبارات دورية",
  "مساعد ذكي متكامل للإجابة على التساؤلات 24/7",
  "متابعة دقيقة لمستوى التقدم والدرجات",
];

const parseDescription = (desc?: string): string[] => {
  if (!desc) return DEFAULT_PLAN_FEATURES;
  try {
    if (desc.startsWith("[") && desc.endsWith("]")) {
      const parsed = JSON.parse(desc);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const split = desc.split("\n").map((s) => s.trim()).filter(Boolean);
  return split.length > 0 ? split : DEFAULT_PLAN_FEATURES;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [user, setUser] = useState<{ name: string; role: string; educationalStage?: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        const raw = await r.text();
        return raw ? JSON.parse(raw) : {};
      })
      .then((d) => {
        if (d.user) {
          setUser({ name: d.user.name, role: d.user.role, educationalStage: d.user.educationalStage });
          if (d.user.educationalStage) {
            setSelectedStage(d.user.educationalStage);
          }
        }
      })
      .catch(() => setUser(null));
  }, []);

  const fetchPlans = useCallback(async (stage: string) => {
    setLoading(true);
    setError("");

    try {
      const url = `/api/plans${stage && stage !== "all" ? `?stage=${stage}` : "?stage=all"}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "فشل تحميل الخطط الدراسية");
      }

      setPlans(data.plans || []);
    } catch (err) {
      console.error("Fetch plans error:", err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => fetchPlans(selectedStage), 150);
    return () => window.clearTimeout(t);
  }, [selectedStage, fetchPlans]);

  // If loading is done and there are NO published plans in DB, make the plans section completely invisible
  const hasNoPlans = !loading && plans.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col min-h-screen bg-[var(--bg)]" dir="rtl">
        <Navbar user={user} />
        
        {!hasNoPlans && (
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-12">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="mb-8 md:mb-10 text-center"
            >
              <span className="inline-block px-3 py-1 mb-3 text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 rounded-full">
                الخيار الأشمل والأنسب للتفوق
              </span>
              <h1 className="text-balance text-3xl md:text-4xl lg:text-5xl font-black text-[var(--ink)] tracking-tight mb-3">
                الخطط الدراسية المنفذة بالمنصة
              </h1>
              <p className="text-[var(--ink-muted)] text-base max-w-2xl mx-auto leading-relaxed">
                مسارات تعليمية متكاملة مصممة خصيصًا لتغطية المنهج بالشرح، التطبيقات العملية، الاختبارات التقييمية، ومتابعة الذكاء الاصطناعي المستمرة.
              </p>
            </motion.div>

            {/* Stage Filter Tabs */}
            <div className="mb-8 flex items-center justify-center">
              <div className="flex flex-wrap gap-2 justify-center p-1.5 bg-slate-900/60 border border-slate-800/60 rounded-2xl max-w-4xl">
                {STAGES.map((st) => {
                  const isActive = selectedStage === st.value;
                  return (
                    <button
                      key={st.value}
                      onClick={() => setSelectedStage(st.value)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Results Summary */}
            {!loading && plans.length > 0 && (
              <div className="mb-6 flex items-center justify-between gap-3 px-2">
                <p className="text-sm text-[var(--ink-muted)]">
                  الخطط المتاحة: <span className="font-bold text-[var(--ink)]">{plans.length.toLocaleString("ar-EG")}</span> خطة
                </p>
                {selectedStage !== "all" && (
                  <button
                    onClick={() => setSelectedStage("all")}
                    className="text-xs font-bold text-indigo-400 hover:underline"
                  >
                    عرض جميع المراحل الدراسية
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--error)]/25 bg-[var(--error)]/8 px-5 py-4 text-sm text-[var(--error)]">
                <span>{error}</span>
                <button
                  onClick={() => fetchPlans(selectedStage)}
                  className="shrink-0 rounded-lg bg-[var(--error)] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* Plans Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout" initial={false}>
                  {plans.map((plan, i) => {
                    const points = parseDescription(plan.description);
                    const isFeatured = i === 0;

                    return (
                      <motion.div
                        key={plan.id}
                        layout
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: { duration: 0.32, ease: EASE, delay: Math.min(i * 0.04, 0.32) },
                        }}
                        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
                        className="h-full"
                      >
                        <div
                          className={`relative flex flex-col h-full rounded-3xl p-6 md:p-8 transition-all duration-300 bg-slate-950/70 border text-right ${
                            isFeatured
                              ? "border-indigo-500 shadow-[0_0_30px_-5px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/20"
                              : "border-slate-800 hover:border-slate-700 hover:shadow-xl"
                          }`}
                        >
                          {isFeatured && (
                            <span className="absolute -top-3 left-6 px-3 py-1 text-[10px] font-black tracking-widest text-indigo-300 bg-indigo-950 border border-indigo-500/40 rounded-full uppercase">
                              مستحسنة ومتكاملة ⭐
                            </span>
                          )}

                          {/* Plan Stage & Month Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-900/40 text-indigo-300 border border-indigo-700/40">
                              {STAGE_LABELS[plan.educationalStage] || plan.educationalStage}
                            </span>
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-900/40 text-purple-300 border border-purple-700/40">
                              الشهر {plan.monthIndex || 1}
                            </span>
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                              {plan._count?.lessons || 10} درساً
                            </span>
                          </div>

                          {/* Plan Title */}
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-white mb-2 leading-snug">{plan.title}</h3>
                          </div>

                          {/* Price Area */}
                          <div className="flex items-baseline gap-1 mb-6 text-white pb-5 border-b border-slate-800">
                            {plan.effectivePrice === 0 ? (
                              <span className="text-3xl font-black text-emerald-400">مجاناً بالكامل</span>
                            ) : (
                              <>
                                <span className="text-3xl font-black tracking-tight">{plan.effectivePrice}</span>
                                <span className="text-sm font-bold text-slate-300">جنيه مصري</span>
                                <span className="text-xs text-slate-400 font-bold mr-1">/ {plan.durationDays || 30} يوم</span>
                              </>
                            )}
                          </div>

                          {/* Features / Static Options List */}
                          <div className="space-y-4 flex-1 mb-8">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">مواصفات الخطة الدراسية:</p>
                            <ul className="space-y-3">
                              {points.map((pt: string, idx: number) => (
                                <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-300 leading-relaxed">
                                  <span className="text-emerald-400 font-black shrink-0 mt-0.5">✓</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Action Button */}
                          <div className="mt-auto">
                            <Link
                              href={plan.hasAccess ? `/plans/${plan.id}/learn` : `/plans/${plan.id}`}
                              className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all text-center block ${
                                plan.hasAccess
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30"
                                  : plan.effectivePrice === 0
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
                                  : "bg-white hover:bg-slate-100 text-slate-950 font-black shadow-lg"
                              }`}
                            >
                              {plan.hasAccess ? "متابعة التعلم في الخطة ➔" : "عرض تفاصيل الخطة والاشتراك ➔"}
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </main>
        )}

        {hasNoPlans && (
          <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 text-center flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12 rounded-3xl bg-slate-950/60 border border-slate-800 text-center max-w-lg w-full shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-700/40 flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg">
                📚
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white mb-2" style={{ fontFamily: "var(--font-head)" }}>
                لا توجد خطط دراسية متاح التسجيل فيها حالياً
              </h2>
              <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">
                لم يتم إتاحة خطط دراسية لهذه المرحلة حتى الآن. يمكنك تصفح الكورسات والمواد التعليمية المتاحة على المنصة.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {selectedStage !== "all" && (
                  <button
                    onClick={() => setSelectedStage("all")}
                    className="px-5 py-2.5 text-xs font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 rounded-xl hover:bg-indigo-900/60 transition-colors"
                  >
                    عرض جميع المراحل
                  </button>
                )}
                <Link
                  href="/courses"
                  className="px-6 py-2.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
                >
                  تصفح الكورسات المتاحة ➔
                </Link>
              </div>
            </motion.div>
          </main>
        )}

        <Footer />
      </div>
    </MotionConfig>
  );
}
