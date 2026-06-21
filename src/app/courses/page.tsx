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
      className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "text-white"
          : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          className={`absolute inset-0 rounded-full ${activeClass}`}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
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
      <div className="flex flex-col min-h-screen bg-[var(--bg)]">
        <Navbar user={user} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-12">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="mb-8 md:mb-10"
          >
            <h1 className="text-balance text-3xl md:text-4xl font-black text-[var(--ink)] tracking-tight mb-2">
              الكورسات
            </h1>
            <p className="text-[var(--ink-muted)] text-base">
              اختر صفك ومادتك، وابدأ المذاكرة خلال دقيقة واحدة
            </p>
          </motion.div>

          {/* Filter rail — sticky under navbar */}
          <div className="sticky top-16 z-[var(--z-dropdown)] mb-8">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 dark:bg-[#0f172a]/90 backdrop-blur-xl shadow-sm p-3 md:p-4 space-y-3">

              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="ابحث عن كورس…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] dark:bg-[#1e293b] text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] text-sm transition-all"
                  aria-label="البحث في الكورسات"
                />
                <kbd
                  aria-hidden
                  className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 items-center justify-center rounded border border-[var(--border)] bg-[var(--card)] text-xs font-mono text-[var(--ink-muted)]"
                >
                  /
                </kbd>
              </div>

              {/* Stage filter pills */}
              <div
                role="group"
                aria-label="تصفية حسب المستوى"
                className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <FilterPill
                  active={stage === ""}
                  onClick={() => writeStageParam("")}
                  layoutId="stage-pill"
                  activeClass="bg-[#2563eb] dark:bg-sky-500"
                >
                  كل المستويات
                </FilterPill>
                {EDUCATIONAL_STAGES.map((s) => (
                  <FilterPill
                    key={s.value}
                    active={stage === s.value}
                    onClick={() => writeStageParam(s.value)}
                    layoutId="stage-pill"
                    activeClass="bg-[#2563eb] dark:bg-sky-500"
                  >
                    {shortStageLabel(s.label)}
                  </FilterPill>
                ))}
              </div>

              {/* Teacher filter pills */}
              {teachers.length > 0 && (
                <div
                  role="group"
                  aria-label="تصفية حسب المعلم"
                  className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-[var(--border)] pt-2.5"
                >
                  <FilterPill
                    active={filters.teacher === ""}
                    onClick={() => setFilters((f) => ({ ...f, teacher: "" }))}
                    layoutId="teacher-pill"
                    activeClass="bg-[#2563eb] dark:bg-sky-500"
                  >
                    كل المعلمين
                  </FilterPill>
                  {teachers.map((t) => (
                    <FilterPill
                      key={t.id}
                      active={filters.teacher === t.id}
                      onClick={() => setFilters((f) => ({ ...f, teacher: t.id }))}
                      layoutId="teacher-pill"
                      activeClass="bg-[#2563eb] dark:bg-sky-500"
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

          {/* Count + clear row */}
          {!loading && !error && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--ink-muted)]">
                <span className="font-bold text-[var(--ink)]">{courses.length.toLocaleString("ar-EG")}</span> كورس
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
                >
                  مسح الفلاتر
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--error)]/25 bg-[var(--error)]/8 px-5 py-4 text-sm text-[var(--error)]">
              <span>{error}</span>
              <button
                onClick={fetchCourses}
                className="shrink-0 rounded-lg bg-[var(--error)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Loading skeletons */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : courses.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout" initial={false}>
                {courses.map((course, i) => (
                  <motion.div
                    key={course.id}
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
                    <CourseCard course={course} onCodeApplied={fetchCourses} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Empty state */
            !error && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="text-center py-24"
              >
                <div className="mx-auto mb-5 w-14 h-14 flex items-center justify-center rounded-2xl bg-[var(--card)] border border-[var(--border)]">
                  <svg className="w-7 h-7 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-[var(--ink)]">لا توجد كورسات بهذه المعايير</p>
                <p className="text-sm mt-1.5 text-[var(--ink-muted)]">جرب توسيع البحث أو مسح الفلاتر الحالية</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-5 rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8] transition-colors"
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
