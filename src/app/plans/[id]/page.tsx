"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { useToast } from "@/components/ui/Toast";

type PlanLessonPreview = {
  id: string;
  title: string;
  order: number;
  requiresQuiz: boolean;
  requiresHomework: boolean;
  hasProject: boolean;
};

type PlanPreview = {
  id: string;
  title: string;
  educationalStage: string;
  description?: string | null;
  price: number;
  discountPrice: number | null;
  discountExpiresAt: string | null;
  effectivePrice: number;
  totalLessons: number;
  lessons: PlanLessonPreview[];
  hasAccess: boolean;
};

const STAGE_LABELS: Record<string, string> = {
  sec_1: "أولى بكالوريا",
  sec_2: "ثانية بكالوريا",
  sec_3: "ثالثة بكالوريا",
};

export default function PlanProductPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const params = useParams<{ id: string }>();
  const planId = params.id;

  const [plan, setPlan] = useState<PlanPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string; phone?: string | null } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [payMode, setPayMode] = useState<"code" | "balance">("code");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => { const raw = await r.text(); return raw ? JSON.parse(raw) : {}; })
      .then((d) => setUser(d.user ? { name: d.user.name, role: d.user.role, phone: d.user.phone ?? null } : null))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  const loadPreview = async () => {
    if (!planId) return;
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.plan?.hasAccess) {
          router.replace(`/plans/${planId}/learn`);
          return;
        }
        setPlan(data.plan);
      } else if (res.status === 404) {
        setPlan(null);
      } else {
        setFetchError("حدث خطأ أثناء تحميل الخطة، حاول مرة أخرى");
      }
    } catch {
      setFetchError("تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPreview();
  }, [planId]);

  const purchasePlan = async () => {
    if (!user) { router.push(`/login?redirect_url=/plans/${planId}`); return; }
    setPurchasing(true);
    try {
      const res = await fetch(`/api/plans/${planId}/purchase`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toastSuccess(data.message || "تم الشراء بنجاح!");
        router.push("/library");
      } else {
        toastError(data.error || "تعذر إتمام الشراء");
      }
    } catch {
      toastError("حدث خطأ أثناء الشراء");
    } finally {
      setPurchasing(false);
    }
  };

  const applyCode = async () => {
    if (!code.trim()) return;
    if (!user) { router.push("/login"); return; }
    setApplying(true);
    const res = await fetch("/api/codes", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json();
    setApplying(false);
    if (res.ok) {
      toastSuccess(data.message || "تم تفعيل الكود بنجاح! جارٍ الدخول...");
      router.push("/library");
    } else if (res.status === 401) {
      router.push("/login");
    } else {
      toastError(data.error || "كود غير صحيح أو منتهي الصلاحية");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-lg">جارٍ التحميل...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">⚠️</p>
            <p className="text-base text-gray-700 dark:text-gray-300">{fetchError}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={loadPreview} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">إعادة المحاولة</button>
              <button onClick={() => router.push("/plans")} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 font-medium">العودة للخطط</button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">الخطة غير موجودة</p>
            <button onClick={() => router.push("/plans")} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">العودة للخطط</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
      <Navbar user={user} />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15">
                {STAGE_LABELS[plan.educationalStage] || plan.educationalStage}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 font-bold">
                خطة دراسية
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">{plan.title}</h1>
            {plan.description && (() => {
              let points: string[] = [];
              try {
                if (plan.description.startsWith('[') && plan.description.endsWith(']')) {
                  points = JSON.parse(plan.description);
                } else {
                  points = plan.description.split('\n').filter(Boolean);
                }
              } catch {
                points = plan.description.split('\n').filter(Boolean);
              }
              if (points.length === 1 && points[0] === plan.description) {
                return <p className="text-white/80 text-base leading-relaxed mb-6">{plan.description}</p>;
              }
              return (
                <ul className="list-disc list-inside space-y-2 text-white/90 text-sm md:text-base mb-6 text-right max-w-xl">
                  {points.map((p, i) => (
                    <li key={i} className="leading-relaxed">{p}</li>
                  ))}
                </ul>
              );
            })()}
            <div className="flex flex-wrap gap-4 text-sm text-white/70">
              <span>📚 {plan.totalLessons} درس متسلسل</span>
              <span>✅ متابعة مستمرة</span>
              <span>🤖 تقييم بالذكاء الاصطناعي</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: content overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">مسار الخطة</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{plan.totalLessons} درس</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {plan.lessons.map((lesson, idx) => (
                  <li key={lesson.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{lesson.title}</p>
                        <div className="flex gap-2 mt-1">
                          {lesson.requiresQuiz && <span className="text-[10px] text-orange-600 bg-orange-100 px-1.5 rounded">اختبار</span>}
                          {lesson.requiresHomework && <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 rounded">واجب</span>}
                          {lesson.hasProject && <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 rounded">مشروع AI</span>}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: pricing card */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
              <div className="p-6 space-y-5">
                {/* Price display */}
                {plan.effectivePrice === 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">مجاني</span>
                  </div>
                ) : plan.discountPrice !== null ? (
                  <div className="space-y-1">
                    <div className="flex items-end gap-3">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{plan.effectivePrice} جنيه</span>
                      <span className="text-lg text-gray-400 line-through mb-0.5">{plan.price} جنيه</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{plan.price} جنيه</span>
                  </div>
                )}

                {/* CTA */}
                {plan.hasAccess ? (
                  <button
                    onClick={() => router.push(`/plans/${plan.id}/learn`)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-colors"
                  >
                    متابعة الخطة ←
                  </button>
                ) : plan.effectivePrice === 0 ? (
                  <div className="space-y-3">
                    <button
                      onClick={purchasePlan}
                      disabled={purchasing || userLoading}
                      className="w-full py-3 rounded-xl text-white font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-lg bg-indigo-600 hover:bg-indigo-700"
                    >
                      {purchasing ? "جارٍ التثبيت..." : "تثبيت الخطة مجانًا"}
                    </button>
                    {!userLoading && !user && (
                      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        يلزم <button onClick={() => router.push(`/login?redirect_url=/plans/${planId}`)} className="text-indigo-600 underline">تسجيل الدخول</button> أولاً
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <button onClick={() => setPayMode("balance")}
                        className="flex-1 rounded-[10px] text-sm font-bold cursor-pointer border-none transition-colors"
                        style={{ padding: "10px", background: payMode === "balance" ? "var(--gold-2)" : "transparent", color: payMode === "balance" ? "#fff" : "var(--ink-3)" }}>
                        💰 رصيد
                      </button>
                      <button onClick={() => setPayMode("code")}
                        className="flex-1 rounded-[10px] text-sm font-bold cursor-pointer border-none transition-colors"
                        style={{ padding: "10px", background: payMode === "code" ? "var(--brand)" : "transparent", color: payMode === "code" ? "#fff" : "var(--ink-3)" }}>
                        🔑 كود
                      </button>
                    </div>

                    {payMode === "balance" ? (
                      <>
                        <button onClick={purchasePlan} disabled={purchasing || userLoading}
                          className="w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:opacity-90"
                          style={{ background: "linear-gradient(135deg,var(--gold-2),#9a6a1c)" }}>
                          {purchasing ? "جارٍ الشراء..." : `شراء بـ ${plan.effectivePrice} جنيه`}
                        </button>
                        {!user && <p className="text-xs text-center text-gray-500"><button onClick={() => router.push(`/login?redirect_url=/plans/${planId}`)} className="text-indigo-600 underline">سجّل الدخول</button> أولاً</p>}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-600 text-center">أدخل كود الاشتراك الخاص بالخطة:</p>
                        <div className="flex gap-2">
                          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && applyCode()} placeholder="كود الوصول" maxLength={16} dir="ltr"
                            className="flex-1 rounded-xl px-3 py-2.5 text-center font-mono text-sm tracking-widest focus:outline-none border border-gray-200" />
                          <button onClick={applyCode} disabled={applying || !code.trim()}
                            className="rounded-xl px-4 py-2.5 text-white font-bold text-sm bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
                            {applying ? "..." : "تفعيل"}
                          </button>
                        </div>
                        {!user && <p className="text-xs text-center text-gray-500"><button onClick={() => router.push("/login")} className="text-indigo-600 underline">سجّل الدخول</button> أولاً</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
