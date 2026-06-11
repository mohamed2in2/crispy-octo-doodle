"use client";
import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { CourseCard } from "@/components/courses/CourseCard";
import { StudentInsights } from "@/components/ai/StudentInsights";
import { EDUCATIONAL_STAGES } from "@/types";

interface Course {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  educationalStage?: string;
  thumbnailUrl?: string;
  teacher: { id: string; name: string };
  isPaid?: boolean;
  price?: number | null;
  discountPercent?: number | null;
  discountExpiresAt?: string | null;
  hasAccess?: boolean;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const VALID_STAGES = new Set(EDUCATIONAL_STAGES.map((s) => s.value));

// "المستوى الخامس (الصف الأول الثانوي)" → "الأول الثانوي"
const shortStageLabel = (label: string) => {
  const inParens = label.match(/\(([^)]+)\)/)?.[1];
  return inParens ? inParens.replace(/^الصف\s/, "") : label;
};

/*
 * The URL is the source of truth for the stage filter — links like
 * /courses?stage=sec_3 are shareable and the back button just works.
 * Only whitelisted values are accepted; query params are user input.
 */
const stageListeners = new Set<() => void>();

function subscribeToStage(listener: () => void) {
  stageListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    stageListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function readStageParam() {
  const stage = new URLSearchParams(window.location.search).get("stage") ?? "";
  return VALID_STAGES.has(stage) ? stage : "";
}

function writeStageParam(stage: string) {
  const url = new URL(window.location.href);
  if (stage) url.searchParams.set("stage", stage);
  else url.searchParams.delete("stage");
  window.history.replaceState(null, "", url.toString());
  stageListeners.forEach((notify) => notify());
}

function FilterPill({
  active,
  onClick,
  layoutId,
  activeClass,
  children,
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  activeClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
        active
          ? "text-white"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          className={`absolute inset-0 rounded-full shadow-lg ${activeClass}`}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <span className="relative z-10 whitespace-nowrap">{children}</span>
    </button>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [filters, setFilters] = useState({ teacher: "", search: "" });
  const stage = useSyncExternalStore(subscribeToStage, readStageParam, () => "");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        const raw = await r.text();
        return raw ? JSON.parse(raw) : {};
      })
      .then((d) => setUser(d.user ? { name: d.user.name, role: d.user.role } : null))
      .catch(() => setUser(null));
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (filters.teacher) params.set("teacher", filters.teacher);
    if (filters.search) params.set("search", filters.search);

    try {
      const res = await fetch(`/api/courses?${params}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "تعذر الاتصال بالخادم. حاول مرة أخرى.");
      }

      const nextCourses: Course[] = data.courses || [];
      setCourses(nextCourses);

      const uniqueTeachers: { id: string; name: string }[] = [];
      const seenIds = new Set<string>();
      for (const c of nextCourses) {
        if (c.teacher?.id && !seenIds.has(c.teacher.id)) {
          uniqueTeachers.push(c.teacher);
          seenIds.add(c.teacher.id);
        }
      }
      setTeachers(uniqueTeachers);
    } catch (err) {
      console.error("Fetch courses error:", err);
      setCourses([]);
      setTeachers([]);
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الكورسات");
    } finally {
      setLoading(false);
    }
  }, [filters, stage]);

  // Single debounced fetch path: absorbs keystrokes, stays snappy for pill clicks.
  useEffect(() => {
    const t = window.setTimeout(fetchCourses, 250);
    return () => window.clearTimeout(t);
  }, [fetchCourses]);

  const clearFilters = () => {
    writeStageParam("");
    setFilters({ teacher: "", search: "" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hasActiveFilters = Boolean(stage || filters.teacher || filters.search);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0B0F19]">
        <Navbar user={user} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-8 md:mb-10 text-center flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold mb-5 border border-indigo-100 dark:border-indigo-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              استكشف مكتبتنا
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-3 text-gray-900 dark:text-white tracking-tight">
              مكتبة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">الدورات</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto md:text-lg">
              اختر صفك ومادتك، وابدأ المذاكرة خلال دقيقة واحدة
            </p>
          </motion.div>

          {/* Filter rail — docks under the navbar while browsing */}
          <div className="sticky top-20 z-30 mb-8">
            <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/85 dark:bg-[#0B0F19]/85 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/25 p-3 md:p-4 space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="ابحث عن دورة…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0F141F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                  aria-label="البحث في الدورات"
                />
                <kbd
                  aria-hidden
                  className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-mono text-gray-400"
                >
                  /
                </kbd>
              </div>

              <div
                role="group"
                aria-label="تصفية حسب المستوى"
                className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <FilterPill
                  active={stage === ""}
                  onClick={() => writeStageParam("")}
                  layoutId="stage-pill"
                  activeClass="bg-indigo-600 shadow-indigo-500/30"
                >
                  كل المستويات
                </FilterPill>
                {EDUCATIONAL_STAGES.map((s) => (
                  <FilterPill
                    key={s.value}
                    active={stage === s.value}
                    onClick={() => writeStageParam(s.value)}
                    layoutId="stage-pill"
                    activeClass="bg-indigo-600 shadow-indigo-500/30"
                  >
                    {shortStageLabel(s.label)}
                  </FilterPill>
                ))}
              </div>

              {teachers.length > 0 && (
                <div
                  role="group"
                  aria-label="تصفية حسب المعلم"
                  className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-gray-100 dark:border-white/5 pt-2.5"
                >
                  <FilterPill
                    active={filters.teacher === ""}
                    onClick={() => setFilters((f) => ({ ...f, teacher: "" }))}
                    layoutId="teacher-pill"
                    activeClass="bg-emerald-600 shadow-emerald-500/30"
                  >
                    كل المعلمين
                  </FilterPill>
                  {teachers.map((t) => (
                    <FilterPill
                      key={t.id}
                      active={filters.teacher === t.id}
                      onClick={() => setFilters((f) => ({ ...f, teacher: t.id }))}
                      layoutId="teacher-pill"
                      activeClass="bg-emerald-600 shadow-emerald-500/30"
                    >
                      {t.name}
                    </FilterPill>
                  ))}
                </div>
              )}
            </div>
          </div>

          {user?.role === "student" && (
            <div className="mb-6">
              <StudentInsights compact />
            </div>
          )}

          {!loading && !error && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{courses.length.toLocaleString("ar-EG")}</span> كورس متاح
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  مسح الفلاتر
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-700 dark:text-red-300">
              <span>{error}</span>
              <button
                onClick={fetchCourses}
                className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : courses.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout" initial={false}>
                {courses.map((course, i) => (
                  <motion.div
                    key={course.id}
                    layout
                    initial={{ opacity: 0, y: 18, scale: 0.97 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { duration: 0.35, ease: EASE, delay: Math.min(i * 0.04, 0.36) },
                    }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                    transition={{ layout: { duration: 0.35, ease: EASE } }}
                    className="h-full"
                  >
                    <CourseCard course={course} onCodeApplied={fetchCourses} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            !error && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="text-center py-20"
              >
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 text-4xl">
                  📚
                </div>
                <p className="text-xl font-bold text-gray-700 dark:text-gray-200">لا توجد كورسات بهذه المعايير</p>
                <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">جرب توسيع البحث أو امسح الفلاتر الحالية</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-colors"
                  >
                    مسح الفلاتر
                  </button>
                )}
              </motion.div>
            )
          )}
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
