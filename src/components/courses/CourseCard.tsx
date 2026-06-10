"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

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

export function CourseCard({ course, onCodeApplied }: CourseCardProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const now = new Date();
  const discountActive =
    course.discountPercent != null &&
    course.discountPercent > 0 &&
    (course.discountExpiresAt == null || new Date(course.discountExpiresAt) > now);
  const effectivelyFree = !course.isPaid || (discountActive && course.discountPercent === 100);

  const applyCode = async () => {
    if (!code.trim()) return;
    setApplying(true);
    const res = await fetch("/api/codes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });
    const data = await res.json();
    setApplying(false);
    if (res.ok) {
      const title = data.courseTitle || course.title;
      toastSuccess(data.message || `تم إضافة «${title}» إلى مكتبتك بنجاح`);
      setCode("");
      onCodeApplied();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("library-refresh", String(Date.now()));
      }
      router.push("/library");
    } else if (res.status === 401) {
      toastError("يجب تسجيل الدخول أولاً لاستخدام الكود");
    } else {
      toastError(data.error || "فشل تفعيل الكود");
    }
  };

  const subjectColors: Record<string, string> = {
    رياضيات: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    فيزياء: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    كيمياء: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    أحياء: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "لغة عربية": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "لغة إنجليزية": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };
  const subjectClass =
    subjectColors[course.subject ?? ""] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-transparent bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 dark:bg-[#151B2B] dark:shadow-black/20 relative">
      {/* Thumbnail Area */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 m-2 rounded-2xl">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={`صورة مصغرة لكورس ${course.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/50">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        )}
        
        {/* Badges on Thumbnail */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md bg-white/90 dark:bg-black/40 dark:text-white text-gray-900 shadow-sm border border-white/20`}>
            {STAGE_LABELS[course.educationalStage ?? ""]?.split(" (")[0] || course.educationalStage || "عام"}
          </span>
        </div>
        
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {effectivelyFree && (
            <span className="rounded-full bg-emerald-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white shadow-sm">
              مجاني
            </span>
          )}
          {discountActive && !effectivelyFree && (
            <span className="rounded-full bg-pink-500/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white shadow-sm">
              -{course.discountPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${subjectColors[course.subject ?? ""]?.split(" ")[1] || "text-purple-600 dark:text-purple-400"}`}>
            {course.subject}
          </span>
          {course.isPaid && course.price != null && (
            <div className="flex items-baseline gap-1.5">
              {discountActive ? (
                <>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {Math.round(course.price * (1 - (course.discountPercent ?? 0) / 100))} ج.م
                  </span>
                  <span className="text-xs text-gray-400 line-through">{course.price}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-gray-900 dark:text-white">{course.price} ج.م</span>
              )}
            </div>
          )}
        </div>

        <h2 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
          {course.title}
        </h2>
        
        <p className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px]">👨‍🏫</span> 
          {course.teacher.name}
        </p>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-end text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800/60 pb-3 mb-3">
            <div className="flex items-center gap-1 text-amber-500">
              <span className="font-medium">4.9</span>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          <button
            onClick={() => router.push(`/courses/${course.id}`)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 dark:border-gray-700 dark:bg-[#1A2235] dark:text-gray-300 dark:hover:border-purple-700 dark:hover:bg-purple-900/30"
            aria-label={`عرض تفاصيل كورس ${course.title}`}
          >
            عرض التفاصيل
          </button>
          
          {course.hasAccess && (
            <button
              onClick={() => router.push(`/courses/${course.id}/learn`)}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 shadow-md shadow-purple-500/20"
              aria-label={`الدخول إلى كورس ${course.title}`}
            >
              متابعة التعلم
            </button>
          )}
          
          {!effectivelyFree && (
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && applyCode()}
                placeholder="أدخل كود الوصول"
                maxLength={8}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center font-mono text-sm tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-[#1A2235] dark:text-white transition-all"
                dir="ltr"
              />
              <button
                onClick={applyCode}
                disabled={applying || !code.trim()}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700 disabled:opacity-50 shadow-sm"
                aria-label="تفعيل كود الوصول"
              >
                {applying ? "..." : "تفعيل"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
