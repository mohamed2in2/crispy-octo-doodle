"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { useToast } from "@/components/ui/Toast";
import { CourseFeedbackForm } from "@/components/ai/CourseFeedbackForm";
import { SecurePlayer } from "@/components/ui/SecurePlayer";

type CoursePreview = {
  id: string;
  slug?: string | null;
  title: string;
  subject: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  educationalStage: string;
  teacher: { id: string; name: string };
  isPaid: boolean;
  price: number | null;
  discountPercent: number | null;
  discountExpiresAt: string | null;
  effectivePrice: number;
  totalVideos: number;
  totalQuizzes: number;
  folders: Array<{ id: string; name: string; videoCount: number; quizCount: number }>;
  freeVideos?: Array<{ id: string; title: string }>;
  hasAccess: boolean;
  allowDirectInstall: boolean;
};

function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? "2" + digits.slice(1) : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

const STAGE_LABELS: Record<string, string> = {
  sec_1: "أولى بكالوريا",
  sec_2: "ثانية بكالوريا",
  sec_3: "ثالثة بكالوريا",
};

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setRemaining(`${d} يوم ${h} ساعة`);
      else if (h > 0) setRemaining(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      else setRemaining(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return expiresAt ? remaining : null;
}

export default function CourseProductPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string; phone?: string | null; parentPhone?: string | null } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [payMode, setPayMode] = useState<"code" | "balance">("code");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  // Free/demo inline player
  const [demo, setDemo] = useState<{ title: string; embedUrl: string; provider?: string } | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const countdown = useCountdown(course?.discountExpiresAt ?? null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => { const raw = await r.text(); return raw ? JSON.parse(raw) : {}; })
      .then((d) => setUser(d.user ? { name: d.user.name, role: d.user.role, phone: d.user.phone ?? null, parentPhone: d.user.parentPhone ?? null } : null))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

  const playDemo = async (video: { id: string; title: string }) => {
    setDemoLoading(video.id);
    try {
      const res = await fetch(`/api/videos/${video.id}/watch`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.embedUrl) {
        setDemo({ title: video.title, embedUrl: data.embedUrl, provider: data.provider });
      } else {
        toastError(data.error || "تعذر تشغيل المحاضرة التجريبية");
      }
    } catch {
      toastError("تعذر تشغيل المحاضرة التجريبية");
    } finally {
      setDemoLoading(null);
    }
  };

  const loadPreview = async () => {
    if (!courseId) return;
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/preview`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        const init: Record<string, boolean> = {};
        (data.course.folders as CoursePreview["folders"]).forEach((f, i) => { init[f.id] = i === 0; });
        setOpenFolders(init);
      } else if (res.status === 404) {
        setCourse(null);
      } else {
        setFetchError("حدث خطأ أثناء تحميل الكورس، حاول مرة أخرى");
      }
    } catch {
      setFetchError("تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) {
      const doLoad = async () => {
        setLoading(true);
        setFetchError("");
        try {
          const res = await fetch(`/api/courses/${courseId}/preview`);
          if (res.ok) {
            const data = await res.json();
            setCourse(data.course);
            const init: Record<string, boolean> = {};
            (data.course.folders as CoursePreview["folders"]).forEach((f, i) => { init[f.id] = i === 0; });
            setOpenFolders(init);
          } else if (res.status === 404) {
            setCourse(null);
          } else {
            setFetchError("حدث خطأ أثناء تحميل الكورس، حاول مرة أخرى");
          }
        } catch {
          setFetchError("تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى");
        }
        setLoading(false);
      };
      doLoad();
    }
  }, [courseId]);

  const enroll = async () => {
    if (!user) { router.push(`/login?redirect_url=/courses/${courseId}`); return; }
    setEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${course?.id ?? courseId}/enroll`, { method: "POST", credentials: "include" });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.ok) {
        toastSuccess(data.message || "تم التسجيل بنجاح!");
        router.push("/library");
      } else if (res.status === 401) {
        router.push(`/login?redirect_url=/courses/${courseId}`);
      } else {
        toastError(data.error || "تعذر التسجيل");
      }
    } catch {
      toastError("حدث خطأ أثناء التسجيل، حاول مرة أخرى");
    }
    setEnrolling(false);
  };

  const purchaseCourse = async () => {
    if (!user) { router.push(`/login?redirect_url=/courses/${courseId}`); return; }
    setPurchasing(true);
    const res = await fetch(`/api/courses/${courseId}/purchase`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setPurchasing(false);
    if (res.ok) {
      toastSuccess(data.message || "تم الشراء بنجاح!");
      router.push("/library");
    } else {
      toastError(data.error || "تعذر إتمام الشراء");
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
              <button onClick={loadPreview} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">إعادة المحاولة</button>
              <button onClick={() => router.push("/courses")} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 font-medium">العودة للكورسات</button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-3">الكورس غير موجود</p>
            <button onClick={() => router.push("/courses")} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">العودة للكورسات</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasDiscount = course.discountPercent != null && course.discountPercent > 0;
  const subjectColors: Record<string, string> = {
    رياضيات: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    فيزياء: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    كيمياء: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    أحياء: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "لغة عربية": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "لغة إنجليزية": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  const subjectClass = subjectColors[course.subject] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">
      {course && (
        <Script
          id="course-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Course",
              "name": course.title,
              "description": course.description || `كورس ${course.subject} للمرحلة ${STAGE_LABELS[course.educationalStage] || course.educationalStage}`,
              "provider": {
                "@type": "Organization",
                "name": "منصة Code-UP الكورسات",
                "url": "https://code-up.tech"
              },
              "educationalLevel": STAGE_LABELS[course.educationalStage] || course.educationalStage,
              "inLanguage": "ar",
              "offers": course.isPaid && course.price ? {
                "@type": "Offer",
                "price": course.effectivePrice,
                "priceCurrency": "EGP",
                "availability": "https://schema.org/InStock"
              } : {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "EGP"
              },
              "hasCourseInstance": {
                "@type": "CourseInstance",
                "courseMode": "online",
                "instructor": {
                  "@type": "Person",
                  "name": course.teacher.name
                }
              }
            })
          }}
        />
      )}
      <Navbar user={user} />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {course.thumbnailUrl && (
          <img src={course.thumbnailUrl} alt={`صورة خلفية لكورس ${course.title}`} className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${subjectClass}`}>{course.subject}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/15">{STAGE_LABELS[course.educationalStage] || course.educationalStage}</span>
              {!course.isPaid && <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">مجاني</span>}
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">{course.title}</h1>
            {course.description && <p className="text-white/80 text-base leading-relaxed mb-6">{course.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-white/70">
              <span>👨‍🏫 {course.teacher.name}</span>
              <span>🎬 {course.totalVideos} محاضرة</span>
              <span>📝 {course.totalQuizzes} اختبار</span>
              <span>📁 {course.folders.length} وحدة</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: content overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Free / demo videos — watchable without enrollment */}
            {course.freeVideos && course.freeVideos.length > 0 && !course.hasAccess && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-500/30 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">شاهد مجاناً</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">محاضرات تجريبية متاحة قبل الاشتراك</p>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {course.freeVideos.map((v) => (
                    <li key={v.id} className="px-6 py-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/12 text-emerald-500 shrink-0">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                        </span>
                        <p className="font-medium text-gray-900 dark:text-white truncate">{v.title}</p>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">مجاناً</span>
                      </div>
                      <button
                        onClick={() => playDemo(v)}
                        disabled={demoLoading === v.id}
                        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors disabled:opacity-60"
                      >
                        {demoLoading === v.id ? "جارٍ التحميل…" : "تشغيل"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">محتوى الكورس</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{course.folders.length} وحدة · {course.totalVideos} محاضرة · {course.totalQuizzes} اختبار</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {course.folders.map((folder) => (
                  <li key={folder.id}>
                    <button
                      onClick={() => setOpenFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-right"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📁</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{folder.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{folder.videoCount} محاضرة · {folder.quizCount} اختبار</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs">{openFolders[folder.id] ? "▴" : "▾"}</span>
                    </button>
                    {openFolders[folder.id] && (
                      <div className="px-6 pb-3 space-y-1.5 bg-gray-50/50 dark:bg-gray-900/30">
                        {Array.from({ length: folder.videoCount }).map((_, i) => (
                          <div key={i} className="flex items-center gap-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <span className="text-gray-300 dark:text-gray-600">🔒</span>
                            <span>محاضرة {i + 1}</span>
                          </div>
                        ))}
                        {Array.from({ length: folder.quizCount }).map((_, i) => (
                          <div key={`q${i}`} className="flex items-center gap-2 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <span className="text-gray-300 dark:text-gray-600">🔒</span>
                            <span>اختبار {i + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: pricing card */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
              {course.thumbnailUrl && (
                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-44 object-cover" />
              )}
              <div className="p-6 space-y-5">

                {/* Price display */}
                {!course.isPaid ? (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">مجاني</span>
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">بالكامل</span>
                  </div>
                ) : hasDiscount ? (
                  <div className="space-y-1">
                    <div className="flex items-end gap-3">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{course.effectivePrice} جنيه</span>
                      <span className="text-lg text-gray-400 line-through mb-0.5">{course.price} جنيه</span>
                      <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold mb-0.5">-{course.discountPercent}%</span>
                    </div>
                    {countdown && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                        <span>⏳</span>
                        <span>ينتهي العرض خلال: <span className="font-mono font-bold">{countdown}</span></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{course.price} جنيه</span>
                  </div>
                )}

                {/* CTA */}
                {course.hasAccess ? (
                  <button
                    onClick={() => router.push(`/courses/${course.id}/learn`)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-colors"
                  >
                    ادخل الكورس الآن ←
                  </button>
                ) : (!course.isPaid || course.effectivePrice === 0) ? (
                  /* Free course — always direct install, no code needed */
                  <div className="space-y-3">
                    <button
                      onClick={enroll}
                      disabled={enrolling || userLoading}
                      className="w-full py-3 rounded-xl text-white font-bold text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98]"
                      style={{
                        background: "linear-gradient(135deg, var(--brand), var(--brand-strong))",
                        boxShadow: "0 8px 24px -8px var(--brand-shadow)",
                      }}
                    >
                      {enrolling ? (
                        <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />جارٍ التثبيت...</>
                      ) : userLoading ? (
                        "جارٍ التحقق..."
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                          </svg>
                          تثبيت الكورس
                        </>
                      )}
                    </button>
                    {!userLoading && !user && (
                      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        يلزم <button onClick={() => router.push(`/login?redirect_url=/courses/${courseId}`)} className="underline" style={{ color: "var(--brand)" }}>تسجيل الدخول</button> أولاً
                      </p>
                    )}
                    <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>
                      مجاني تماماً — يُضاف لمكتبتك فوراً
                    </p>
                  </div>
                ) : (
                  /* Paid course — balance purchase OR code/WhatsApp */
                  <div className="space-y-3">
                    {/* Pay mode toggle */}
                    <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <button onClick={() => setPayMode("balance")}
                        className="flex-1 rounded-[10px] text-sm font-bold cursor-pointer border-none transition-colors"
                        style={{ padding: "10px", background: payMode === "balance" ? "var(--gold-2)" : "transparent", color: payMode === "balance" ? "#fff" : "var(--ink-3)" }}>
                        💰 شراء بالرصيد
                      </button>
                      <button onClick={() => setPayMode("code")}
                        className="flex-1 rounded-[10px] text-sm font-bold cursor-pointer border-none transition-colors"
                        style={{ padding: "10px", background: payMode === "code" ? "var(--brand)" : "transparent", color: payMode === "code" ? "#fff" : "var(--ink-3)" }}>
                        🔑 كود / واتساب
                      </button>
                    </div>

                    {payMode === "balance" ? (
                      <>
                        <button onClick={purchaseCourse} disabled={purchasing || userLoading}
                          className="w-full py-3 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60 hover:opacity-90"
                          style={{ background: "linear-gradient(135deg,var(--gold-2),#9a6a1c)", boxShadow: "0 8px 24px -8px rgba(200,146,47,.5)" }}>
                          {purchasing ? (
                            <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />جارٍ الشراء...</>
                          ) : (
                            `شراء بـ ${course.effectivePrice} جنيه من رصيدك`
                          )}
                        </button>
                        {!user && <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}><button onClick={() => router.push(`/login?redirect_url=/courses/${courseId}`)} className="underline" style={{ color: "var(--brand)" }}>سجّل الدخول</button> أولاً</p>}
                        <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>يمكنك إضافة رصيد من قسم "رصيدي" في حسابك</p>
                      </>
                    ) : (
                      <>
                        <a href={buildWhatsAppUrl(
                            process.env.NEXT_PUBLIC_PAYMENT_ACCESS_PASSWORD || "+201285353604",
                            [
                              `مرحباً، أريد الاشتراك في كورس "${course.title}"`,
                              `المعلم: ${course.teacher.name}`,
                              `السعر: ${course.effectivePrice} جنيه`,
                              `اسم الطالب: ${user?.name || "غير مسجل"}`,
                              user?.phone ? `رقم الطالب: ${user.phone}` : null,
                              user?.parentPhone ? `رقم ولي الأمر: ${user.parentPhone}` : null,
                            ].filter(Boolean).join("\n"),
                          )} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-base transition-colors hover:opacity-90"
                          style={{ background: "#25D366" }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          تواصل للشراء عبر واتسآب
                        </a>
                        <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>بعد الحصول على الكود فعّله هنا:</p>
                        <div className="flex gap-2">
                          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === "Enter" && applyCode()} placeholder="كود الوصول" maxLength={16} dir="ltr"
                            className="flex-1 rounded-xl px-3 py-2.5 text-center font-mono text-sm tracking-widest focus:outline-none transition-colors"
                            style={{ border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--ink)" }} />
                          <button onClick={applyCode} disabled={applying || !code.trim()}
                            className="rounded-xl px-4 py-2.5 text-white font-bold text-sm disabled:opacity-50 transition-colors"
                            style={{ background: "var(--brand)" }}>
                            {applying ? "..." : "تفعيل"}
                          </button>
                        </div>
                        {!user && <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}><button onClick={() => router.push("/login")} className="underline" style={{ color: "var(--brand)" }}>سجّل الدخول</button> أولاً</p>}
                      </>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>✅ وصول كامل لجميع المحاضرات والاختبارات</p>
                  <p>✅ تتبع تقدمك في الكورس</p>
                  <p>✅ اختبارات مع نتائج فورية</p>
                </div>

                {/* Feedback Section for enrolled students */}
                {course.hasAccess && user?.role === "student" && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <CourseFeedbackForm
                      courseId={course.id}
                      courseTitle={course.title}
                      teacherName={course.teacher.name}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Free/demo inline player */}
      {demo && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={demo.title}
        >
          <div className="absolute inset-0 bg-black/70" onClick={() => setDemo(null)} aria-hidden />
          <div className="relative w-full max-w-3xl bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
              <p className="font-bold text-[var(--ink)] truncate flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">مجاناً</span>
                {demo.title}
              </p>
              <button
                onClick={() => setDemo(null)}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors shrink-0"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <SecurePlayer embedUrl={demo.embedUrl} title={demo.title} watermark={user?.phone || user?.name || ""} provider={demo.provider} />
          </div>
        </div>
      )}
    </div>
  );
}
