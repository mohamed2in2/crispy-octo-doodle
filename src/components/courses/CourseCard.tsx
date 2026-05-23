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
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-800">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">📚</div>
        )}
        <div className="absolute right-3 top-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subjectClass}`}>
            {course.subject}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 line-clamp-2 text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
          {course.title}
        </h3>
        <p className="mb-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <span>👨‍🏫</span> {course.teacher.name}
        </p>
        <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
          {STAGE_LABELS[course.educationalStage ?? ""] || course.educationalStage || ""}
        </p>

        <div className="mt-auto space-y-2">
          {course.hasAccess && (
            <button
              onClick={() => router.push(`/courses/${course.id}`)}
              className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              ادخل الكورس
            </button>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && applyCode()}
              placeholder="أدخل كود الوصول"
              maxLength={8}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center font-mono text-sm tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              dir="ltr"
            />
            <button
              onClick={applyCode}
              disabled={applying || !code.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {applying ? "..." : "تفعيل"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
