"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { formatEgp, useCanHover, useCountdown } from "@/lib/motion";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    subject?: string;
    thumbnailUrl?: string | null;
    educationalStage?: string;
    teacher: { id: string; name: string };
    _count?: { accessCodes: number };
    hasAccess?: boolean;
    isPaid?: boolean;
    price?: number | null;
    discountPercent?: number | null;
    discountExpiresAt?: string | null;
  };
  onCodeApplied: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  primary_4: "الرابع الابتدائي",
  primary_5: "الخامس الابتدائي",
  primary_6: "السادس الابتدائي",
  prep_1: "الأول الإعدادي",
  prep_2: "الثاني الإعدادي",
  prep_3: "الثالث الإعدادي",
  sec_1: "الأول الثانوي",
  sec_2: "الثاني الثانوي",
  sec_3: "الثالث الثانوي",
};

const SUBJECT_THEMES: Record<string, { chip: string; glow: string }> = {
  رياضيات: { chip: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", glow: "rgba(59, 130, 246, 0.35)" },
  فيزياء: { chip: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", glow: "rgba(168, 85, 247, 0.35)" },
  كيمياء: { chip: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", glow: "rgba(34, 197, 94, 0.35)" },
  أحياء: { chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", glow: "rgba(16, 185, 129, 0.35)" },
  "لغة عربية": { chip: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", glow: "rgba(239, 68, 68, 0.35)" },
  "لغة إنجليزية": { chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", glow: "rgba(249, 115, 22, 0.35)" },
};

const FALLBACK_THEME = {
  chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  glow: "rgba(99, 102, 241, 0.35)",
};

// Thumbnails come from teacher input — only render http(s) or same-origin paths.
const isSafeSrc = (src: string) => /^https?:\/\//i.test(src) || (src.startsWith("/") && !src.startsWith("//"));

const TILT_SPRING = { stiffness: 260, damping: 20, mass: 0.8 };
const MAX_TILT_DEG = 7;

export function CourseCard({ course, onCodeApplied }: CourseCardProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const tiltEnabled = canHover && !reduced;

  const rotateX = useSpring(0, TILT_SPRING);
  const rotateY = useSpring(0, TILT_SPRING);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(35);
  const glareOpacity = useSpring(0, { stiffness: 180, damping: 28 });
  const glare = useMotionTemplate`radial-gradient(460px circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.09), transparent 65%)`;

  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * MAX_TILT_DEG);
    rotateX.set((0.5 - py) * MAX_TILT_DEG);
    glareX.set(px * 100);
    glareY.set(py * 100);
    glareOpacity.set(1);
  };

  const untilt = () => {
    rotateX.set(0);
    rotateY.set(0);
    glareOpacity.set(0);
  };

  // The shared clock in useCountdown is the only time source here; until it
  // hydrates we trust the server's discount data as-is.
  const countdown = useCountdown(course.discountExpiresAt);
  const hasDiscount = (course.discountPercent ?? 0) > 0;
  const discountActive = hasDiscount && !(countdown?.expired ?? false);
  const effectivelyFree = !course.isPaid || (discountActive && course.discountPercent === 100);
  const finalPrice =
    course.price != null && discountActive
      ? Math.round(course.price * (1 - (course.discountPercent ?? 0) / 100))
      : course.price;

  const theme = SUBJECT_THEMES[course.subject ?? ""] ?? FALLBACK_THEME;
  const stageLabel = STAGE_LABELS[course.educationalStage ?? ""] || course.educationalStage || "عام";
  const thumbnail = course.thumbnailUrl && isSafeSrc(course.thumbnailUrl) ? course.thumbnailUrl : null;
  const teacherInitial = course.teacher.name.trim().charAt(0) || "م";

  const applyCode = async () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized || applying) return;

    setApplying(true);
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data: { message?: string; courseTitle?: string; error?: string } = await res
        .json()
        .catch(() => ({}));

      if (res.ok) {
        toastSuccess(data.message || `تم إضافة «${data.courseTitle || course.title}» إلى مكتبتك بنجاح`);
        setCode("");
        onCodeApplied();
        sessionStorage.setItem("library-refresh", String(Date.now()));
        router.push("/library");
      } else if (res.status === 401) {
        toastError("يجب تسجيل الدخول أولاً لاستخدام الكود");
      } else {
        toastError(data.error || "فشل تفعيل الكود");
      }
    } catch {
      toastError("تعذر الاتصال بالخادم، تأكد من اتصالك بالإنترنت وحاول مجدداً");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="group relative h-full" style={{ perspective: 1100 }}>
      <div
        aria-hidden
        className="absolute inset-2 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
        style={{ background: theme.glow }}
      />

      <motion.article
        style={tiltEnabled ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        onPointerMove={tiltEnabled ? tilt : undefined}
        onPointerLeave={tiltEnabled ? untilt : undefined}
        className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-2xl dark:border-white/5 dark:bg-[#151B2B] dark:shadow-black/30 dark:hover:border-white/10"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 z-20 pointer-events-none rounded-3xl"
          style={{ background: glare, opacity: glareOpacity }}
        />

        {/* Thumbnail */}
        <div className="relative m-2 h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`صورة مصغرة لكورس ${course.title}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/40">
              <svg className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
          )}

          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
            {stageLabel}
          </span>

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {effectivelyFree && (
              <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
                مجاني
              </span>
            )}
            {discountActive && !effectivelyFree && (
              <span className="rounded-full bg-pink-500/90 px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-sm">
                خصم {(course.discountPercent ?? 0).toLocaleString("ar-EG")}٪
              </span>
            )}
          </div>

          {discountActive && countdown && !countdown.expired && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/75 to-black/0 px-3 pb-2 pt-6 text-xs font-bold text-amber-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ينتهي العرض خلال {countdown.label}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            {course.subject ? (
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${theme.chip}`}>
                {course.subject}
              </span>
            ) : (
              <span />
            )}

            {course.isPaid && !effectivelyFree && finalPrice != null && (
              <div className="flex items-baseline gap-1.5" dir="rtl">
                <span className="text-base font-black text-gray-900 dark:text-white">{formatEgp(finalPrice)}</span>
                {discountActive && course.price != null && (
                  <span className="text-xs text-gray-400 line-through">{formatEgp(course.price)}</span>
                )}
              </div>
            )}
          </div>

          <h2 className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
            {course.title}
          </h2>

          <p className="mb-5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-[11px] font-black text-white shadow-sm">
              {teacherInitial}
            </span>
            أ/ {course.teacher.name}
          </p>

          <div className="mt-auto space-y-2.5">
            {course.hasAccess ? (
              <>
                <button
                  onClick={() => router.push(`/courses/${course.id}/learn`)}
                  className="w-full rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:brightness-105 active:scale-[0.98]"
                  aria-label={`الدخول إلى كورس ${course.title}`}
                >
                  متابعة التعلم
                </button>
                <button
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  aria-label={`عرض تفاصيل كورس ${course.title}`}
                >
                  عرض التفاصيل
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push(`/courses/${course.id}`)}
                className="w-full rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/35 hover:brightness-110 active:scale-[0.98]"
                aria-label={`عرض تفاصيل كورس ${course.title}`}
              >
                عرض التفاصيل
              </button>
            )}

            {!effectivelyFree && !course.hasAccess && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && applyCode()}
                  placeholder="أدخل كود الوصول"
                  maxLength={8}
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center font-mono text-sm tracking-widest text-gray-900 transition-all placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-[#0F141F] dark:text-white"
                  dir="ltr"
                  aria-label={`كود الوصول لكورس ${course.title}`}
                />
                <button
                  onClick={applyCode}
                  disabled={applying || !code.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="تفعيل كود الوصول"
                >
                  {applying ? "…" : "تفعيل"}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.article>
    </div>
  );
}
