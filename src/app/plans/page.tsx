"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { SkeletonCard } from "@/components/ui/Skeleton";

const STAGES = [
  { value: "all", label: "الكل" },
  { value: "sec_1", label: "أولى بكالوريا" },
  { value: "sec_2", label: "ثانية بكالوريا" },
];

const STAGE_LABELS: Record<string, string> = {
  sec_1: "أولى بكالوريا",
  sec_2: "ثانية بكالوريا",
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

  const hasNoPlans = !loading && plans.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)" }} dir="rtl">
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
              <span
                className="inline-block px-3 py-1 mb-3 text-xs font-bold rounded-full"
                style={{ color: "#14B8A6", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)" }}
              >
                الخيار الأشمل والأنسب للتفوق
              </span>
              <h1 className="text-balance text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-3" style={{ color: "var(--ink)", fontFamily: "var(--font-head)" }}>
                الخطط الدراسية المنفذة بالمنصة
              </h1>
              <p className="text-base max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--ink-2)" }}>
                مسارات تعليمية متكاملة مصممة خصيصًا لتغطية المنهج بالشرح، التطبيقات العملية، الاختبارات التقييمية، ومتابعة الذكاء الاصطناعي المستمرة.
              </p>
            </motion.div>

            {/* ── Sticky Grade Filter Tabs ── */}
            <div className="sticky top-[60px] sm:top-[74px] z-[var(--z-dropdown)] mb-8 flex items-center justify-center">
              <div className="flex flex-wrap gap-2 justify-center p-1.5 rounded-2xl max-w-4xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                {STAGES.map((st) => {
                  const isActive = selectedStage === st.value;
                  return (
                    <button
                      key={st.value}
                      onClick={() => setSelectedStage(st.value)}
                      className="px-4 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
                      style={{
                        background: isActive ? "#14B8A6" : "transparent",
                        color: isActive ? "#0B0F19" : "var(--ink-2)",
                        fontWeight: isActive ? 800 : 600,
                        boxShadow: isActive ? "0 4px 14px -4px rgba(20,184,166,0.4)" : "none",
                        fontFamily: "var(--font-body)",
                      }}
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
                <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                  الخطط المتاحة: <span className="font-bold" style={{ color: "var(--ink)" }}>{plans.length.toLocaleString("ar-EG")}</span> خطة
                </p>
                {selectedStage !== "all" && (
                  <button
                    onClick={() => setSelectedStage("all")}
                    className="text-xs font-bold border-none bg-transparent cursor-pointer hover:underline"
                    style={{ color: "#14B8A6" }}
                  >
                    عرض جميع المراحل الدراسية
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm"
                style={{ border: "1px solid var(--danger)", background: "var(--danger-soft)", color: "var(--danger)" }}>
                <span>{error}</span>
                <button
                  onClick={() => fetchPlans(selectedStage)}
                  className="shrink-0 rounded-lg px-4 py-2 text-xs font-bold text-white border-none cursor-pointer hover:opacity-90"
                  style={{ background: "var(--danger)" }}
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
                          className="relative flex flex-col h-full rounded-2xl p-6 md:p-8 transition-all duration-300 text-right"
                          style={{
                            background: "var(--surface)",
                            border: isFeatured ? "1px solid rgba(20,184,166,0.5)" : "1px solid var(--border)",
                            boxShadow: isFeatured ? "0 0 30px -5px rgba(20,184,166,0.2)" : "var(--shadow-sm)",
                          }}
                          onMouseEnter={e => { if (!isFeatured) (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                          onMouseLeave={e => { if (!isFeatured) (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}
                        >
                          {isFeatured && (
                            <span className="absolute -top-3 left-6 px-3 py-1 text-[10px] font-black tracking-widest rounded-full uppercase"
                              style={{ color: "#14B8A6", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)" }}>
                              مستحسنة ومتكاملة ⭐
                            </span>
                          )}

                          {/* Plan Stage & Month Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg"
                              style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.25)" }}>
                              {STAGE_LABELS[plan.educationalStage] || plan.educationalStage}
                            </span>
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg"
                              style={{ background: "var(--gold-soft)", color: "var(--gold-2)", border: "1px solid var(--gold-2)" }}>
                              الشهر {plan.monthIndex || 1}
                            </span>
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg"
                              style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>
                              {plan._count?.lessons || 10} درساً
                            </span>
                          </div>

                          {/* Plan Title */}
                          <div className="mb-4">
                            <h3 className="text-xl font-bold leading-snug mb-2" style={{ color: "var(--ink)" }}>{plan.title}</h3>
                          </div>

                          {/* Price Area */}
                          <div className="flex items-baseline gap-1 mb-6 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
                            {plan.effectivePrice === 0 ? (
                              <span className="text-3xl font-black" style={{ color: "#10B981" }}>مجاناً بالكامل</span>
                            ) : (
                              <>
                                <span className="text-3xl font-black tracking-tight" style={{ color: "var(--ink)" }}>{plan.effectivePrice}</span>
                                <span className="text-sm font-bold" style={{ color: "var(--ink-2)" }}>جنيه مصري</span>
                                <span className="text-xs font-bold mr-1" style={{ color: "var(--ink-3)" }}>/ {plan.durationDays || 30} يوم</span>
                              </>
                            )}
                          </div>

                          {/* Roadmap Timeline */}
                          <div className="mb-4 flex items-center gap-2 text-xs font-bold" style={{ color: "var(--ink-2)" }}>
                            <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6" }}>المرحلة 1: أساسيات</span>
                            <span style={{ color: "var(--ink-3)" }}>➔</span>
                            <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}>المرحلة 2: التطبيقات</span>
                          </div>

                          {/* Features */}
                          <div className="space-y-4 flex-1 mb-8">
                            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-3)" }}>مواصفات الخطة الدراسية:</p>
                            <ul className="space-y-3">
                              {points.map((pt: string, idx: number) => (
                                <li key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
                                  <span className="font-black shrink-0 mt-0.5" style={{ color: "#10B981" }}>✓</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Action Button */}
                          <div className="mt-auto">
                            <Link
                              href={plan.hasAccess ? `/plans/${plan.id}/learn` : `/plans/${plan.id}`}
                              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all text-center block no-underline"
                              style={plan.hasAccess ? {
                                background: "linear-gradient(135deg, #10B981, #14B8A6)",
                                color: "#fff",
                                boxShadow: "0 4px 14px -4px rgba(16,185,129,0.4)",
                              } : plan.effectivePrice === 0 ? {
                                background: "#10B981",
                                color: "#fff",
                                boxShadow: "0 4px 14px -4px rgba(16,185,129,0.4)",
                              } : {
                                background: "var(--ink)",
                                color: "var(--bg)",
                                fontWeight: 800,
                                boxShadow: "var(--shadow)",
                              }}
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

        {/* ── Empty State — Human, Clean & Intentional ── */}
        {hasNoPlans && (
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-16 text-center flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-8 md:p-10 rounded-3xl text-center max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              {/* Friendly Icon Badge */}
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-5 border border-emerald-100 dark:border-emerald-900/30">
                📚
              </div>

              <h2 className="text-xl md:text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                لا تتوفر خطط دراسية جديدة حالياً
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                يعمل فريق معلمينا الخبراء على تجهيز المسارات والخطط الدراسية للمرحلة المحددة. يمكنك تصفح جميع الكورسات المتاحة الآن أو العودة لاحقاً.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/courses"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors no-underline shadow-sm"
                >
                  تصفح جميع الكورسات ➔
                </Link>
                {selectedStage !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedStage("all")}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-none cursor-pointer transition-colors"
                  >
                    عرض كل المراحل
                  </button>
                )}
              </div>
            </motion.div>
          </main>
        )}

        <Footer />
      </div>
    </MotionConfig>
  );
}
