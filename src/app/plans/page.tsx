"use client";
import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EDUCATIONAL_STAGES } from "@/types";

const STAGE_LABELS: Record<string, string> = {
  primary_6: "الصف السادس الابتدائي",
  prep_1: "الصف الأول الإعدادي",
  prep_2: "الصف الثاني الإعدادي",
  prep_3: "الصف الثالث الإعدادي",
  sec_1: "الصف الأول الثانوي",
  sec_2: "الصف الثاني الثانوي",
  sec_3: "الصف الثالث الثانوي",
};

const parseDescription = (desc?: string) => {
  if (!desc) return [];
  try {
    if (desc.startsWith("[") && desc.endsWith("]")) {
      return JSON.parse(desc);
    }
  } catch {}
  return desc.split("\n").filter(Boolean);
};


const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string; educationalStage?: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        const raw = await r.text();
        return raw ? JSON.parse(raw) : {};
      })
      .then((d) => setUser(d.user ? { name: d.user.name, role: d.user.role, educationalStage: d.user.educationalStage } : null))
      .catch(() => setUser(null));
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/plans");
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "فشل تحميل الخطط الدراسية");
      }

      setPlans(data.plans || []);
    } catch (err) {
      console.error("Fetch plans error:", err);
      setPlans([]);
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الخطط");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(fetchPlans, 250);
    return () => window.clearTimeout(t);
  }, [fetchPlans]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col min-h-screen bg-[var(--bg)]">
        <Navbar user={user} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="mb-8 md:mb-10 text-center md:text-right"
          >
            <h1 className="text-balance text-3xl md:text-4xl font-black text-[var(--ink)] tracking-tight mb-3">
              الخطط الدراسية الشاملة
            </h1>
            <p className="text-[var(--ink-muted)] text-base max-w-2xl">
              مسارات تعليمية متكاملة مصممة خصيصًا لتغطية المنهج بشكل منهجي، مع اختبارات، ومشاريع، ومتابعة دقيقة لمستواك.
            </p>
          </motion.div>



          {/* Results */}
          {!loading && !error && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--ink-muted)]">
                <span className="font-bold text-[var(--ink)]">{plans.length.toLocaleString("ar-EG")}</span> خطة متاحة
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--error)]/25 bg-[var(--error)]/8 px-5 py-4 text-sm text-[var(--error)]">
              <span>{error}</span>
              <button
                onClick={fetchPlans}
                className="shrink-0 rounded-lg bg-[var(--error)] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : plans.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {plans.map((plan, i) => {
                  const points = parseDescription(plan.description);
                  const isFeatured = plan.price > 0 && i === 1; // Highlight the main plan if multiple exist

                  return (
                    <motion.div
                      key={plan.id}
                      layout
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.32, ease: EASE, delay: Math.min(i * 0.035, 0.32) },
                      }}
                      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
                      transition={{ layout: { duration: 0.32, ease: EASE } }}
                      className="h-full"
                    >
                      <div
                        className={`relative flex flex-col h-full rounded-3xl p-6 md:p-8 transition-all duration-300 bg-slate-950/40 border text-right ${
                          isFeatured
                            ? "border-sky-500 shadow-[0_0_25px_-5px_rgba(14,165,233,0.25)] ring-2 ring-sky-500/20"
                            : "border-slate-800 hover:border-slate-700 hover:shadow-xl"
                        }`}
                      >
                        {isFeatured && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-black tracking-widest text-sky-400 bg-sky-950/80 border border-sky-500/30 rounded-full uppercase">
                            شائع
                          </span>
                        )}

                        {/* Plan Header */}
                        <div className="mb-6">
                          <h3 className="text-xl font-bold text-white mb-2">{plan.title}</h3>
                          <p className="text-xs text-slate-400 font-semibold">
                            {STAGE_LABELS[plan.educationalStage] || plan.educationalStage}
                          </p>
                        </div>

                        {/* Pricing Area */}
                        <div className="flex items-baseline gap-1 mb-6 text-white">
                          <span className="text-sm font-bold opacity-75 self-start mt-1">EGP</span>
                          <span className="text-4xl font-black tracking-tight">{plan.effectivePrice}</span>
                          <span className="text-xs text-slate-400 font-bold mr-1">/ {plan.durationDays} يوم</span>
                        </div>

                        {/* Action Button */}
                        <div className="mb-8">
                          <Link
                            href={plan.hasAccess ? `/plans/${plan.id}/learn` : `/plans/${plan.id}`}
                            className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all text-center block ${
                              plan.hasAccess
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                : plan.effectivePrice === 0
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : isFeatured
                                ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/20"
                                : "bg-white hover:bg-slate-100 text-slate-950 font-black"
                            }`}
                          >
                            {plan.hasAccess ? "متابعة الخطة" : plan.effectivePrice === 0 ? "تفعيل مجاني" : "اشترك الآن"}
                          </Link>
                        </div>

                        {/* Features List */}
                        <div className="space-y-4 flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تتضمن الخطة:</p>
                          <ul className="space-y-3">
                            {points.map((pt: string, idx: number) => (
                              <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-300 leading-relaxed text-right">
                                <span className="text-sky-400 font-bold shrink-0 mt-0.5">✦</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            !error && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-center py-24"
              >
                <div className="mx-auto mb-5 w-14 h-14 flex items-center justify-center rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                  <svg className="w-7 h-7 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-[var(--ink)]">لا توجد خطط متاحة حاليًا</p>
                <p className="text-sm mt-1.5 text-[var(--ink-muted)]">جرب تغيير المرحلة الدراسية</p>
              </motion.div>
            )
          )}
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
