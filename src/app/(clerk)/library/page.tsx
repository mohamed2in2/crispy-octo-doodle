"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

interface Course {
  id: string;
  title: string;
  subject: string;
  description?: string;
  thumbnailUrl?: string;
  teacher: { id: string; name: string };
  folders: Array<{
    id: string;
    name: string;
    videos: Array<{ id: string; title: string; watched: boolean }>;
    quizzes: Array<{ id: string; title: string }>;
  }>;
  totalVideos: number;
  watchedVideos: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
interface Weakness {
  subject: string;
  avgScore: number;
  quizCount: number;
  course: { id: string; title: string };
}
interface StudentStats {
  points: number;
  streak: number;
  watchedVideos: number;
  quizzesPassed: number;
  coursesCount: number;
  hours: number;
  weekActive: boolean[];
  activity: number[];
  achievements: Achievement[];
  achievementsUnlocked: number;
  weaknesses: Weakness[];
}

const ACH_ICON: Record<string, React.ReactElement> = {
  rocket: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 014-7l3-3 3 3-3 3a22 22 0 01-7 4z" />,
  bolt: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
  flame: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 2s4 4 4 8a4 4 0 11-8 0c0-1 .5-2 1-3 0 0-3 2-3 6a6 6 0 0012 0c0-5-6-11-6-11z" />,
  star: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 17.8 5.7 21.2 7 14.2 2 9.4l7-.9L12 2z" />,
  medal: <><circle cx="12" cy="15" r="6" strokeWidth={1.6} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 9L6 2M15 9l3-7M12 13l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 15.3 11 15z" /></>,
  trophy: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />,
};

export default function LibraryPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);

  const loadLibrary = useCallback(() => {
    // All three requests in parallel — /api/auth/me and /api/student/stats are
    // both privately cached (15s and 5min respectively) so repeat visits are fast.
    setLoading(true);
    void Promise.all([
      fetch("/api/auth/me", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then((d: { user?: { name: string; role: string } | null } | null) => {
          if (d?.user) setUser(d.user);
        })
        .catch(() => {}),

      fetch("/api/student/stats", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then((d: StudentStats | null) => { if (d) setStats(d); })
        .catch(() => {}),

      fetch("/api/courses/enrolled", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then((d: { success?: boolean; enrolledCourses?: Course[] } | null) => {
          setCourses(d?.success ? (d.enrolledCourses ?? []) : []);
        })
        .catch(() => setCourses([])),

      fetch("/api/student/plans", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setPlans(d?.enrolledPlans ?? []))
        .catch(() => setPlans([]))
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    sessionStorage.removeItem("library-refresh");
    loadLibrary();
  }, [loadLibrary]);

  const totalVideos = courses.reduce(
    (acc: number, c: Course) =>
      acc +
      (c.folders?.reduce((a: number, f) => a + f.videos.length, 0) || 0),
    0
  );
  const watchedVideos = courses.reduce(
    (acc: number, c: Course) =>
      acc +
      (c.folders?.reduce(
        (a: number, f) => a + f.videos.filter((v) => v.watched).length,
        0
      ) || 0),
    0
  );
  const totalQuizzes = courses.reduce(
    (acc: number, c: Course) =>
      acc +
      (c.folders?.reduce((a: number, f) => a + f.quizzes.length, 0) || 0),
    0
  );

  // Prefer real server stats; fall back to client-derived values until loaded.
  const realPoints = stats?.points ?? 0;
  const realHours = stats?.hours ?? Math.round(watchedVideos * 0.5);
  const realAchievements = stats?.achievementsUnlocked ?? 0;
  const streak = stats?.streak ?? 0;
  const achievements = stats?.achievements ?? [];
  const weaknesses = stats?.weaknesses ?? [];

  // Real last-28-day activity counts → 0–4 intensity buckets for the heatmap.
  const activitySquares = (stats?.activity ?? Array.from({ length: 28 }, () => 0)).map((c) =>
    c >= 4 ? 4 : c
  );

  return (
    <ProfileGuard>
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Greeting */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-black mb-2 flex items-center gap-3">
            مرحباً، <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">{user?.name ? user.name.split(' ')[0] : 'طالب'}</span> 👋
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">لنواصل رحلتك التعليمية اليوم!</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
              {/* Courses Stat */}
              <div className="bg-white dark:bg-[#151B2B] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] dark:bg-[#11302D] flex items-center justify-center text-[var(--brand)]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  {courses.length > 0 && (
                    <span className="text-[10px] font-bold text-[var(--brand)] bg-[var(--brand-soft)] dark:bg-[#11302D] px-2 py-0.5 rounded-lg">
                      نشط
                    </span>
                  )}
                </div>
                <div className="font-head font-black text-2xl md:text-3xl text-[var(--ink)] mt-3">{courses.length + plans.length}</div>
                <div className="text-xs text-[var(--ink-3)] mt-1 font-medium">مسارات نشطة</div>
              </div>

              {/* Achievements Stat */}
              <div className="bg-white dark:bg-[#151B2B] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-[#33231C] flex items-center justify-center text-orange-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  {realAchievements > 0 && (
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-[#33231C] px-2 py-0.5 rounded-lg">
                      +{realAchievements}
                    </span>
                  )}
                </div>
                <div className="font-head font-black text-2xl md:text-3xl text-[var(--ink)] mt-3">{realAchievements}</div>
                <div className="text-xs text-[var(--ink-3)] mt-1 font-medium">إنجازات</div>
              </div>

              {/* Points Stat */}
              <div className="bg-white dark:bg-[#151B2B] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[var(--gold-soft)] dark:bg-[#241D0E] flex items-center justify-center text-[var(--gold-2)]">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3 6.5 7 .6-5.3 4.6L18.3 21 12 17.3 5.7 21l1.6-7.3L2 9.1l7-.6L12 2z" />
                    </svg>
                  </div>
                  {streak > 0 && (
                    <span className="text-[10px] font-bold text-[var(--gold-2)] bg-[var(--gold-soft)] dark:bg-[#241D0E] px-2 py-0.5 rounded-lg">
                      +{streak} أسبوع
                    </span>
                  )}
                </div>
                <div className="font-head font-black text-2xl md:text-3xl text-[var(--ink)] mt-3">{realPoints.toLocaleString()}</div>
                <div className="text-xs text-[var(--ink-3)] mt-1 font-medium">نقطة</div>
              </div>

              {/* Hours Stat */}
              <div className="bg-white dark:bg-[#151B2B] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] dark:bg-[#11302D] flex items-center justify-center text-[var(--brand)]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                </div>
                <div className="font-head font-black text-2xl md:text-3xl text-[var(--ink)] mt-3">{realHours}</div>
                <div className="text-xs text-[var(--ink-3)] mt-1 font-medium">ساعات تعلّم</div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Right Column (Wide) */}
              <div className="lg:col-span-8 flex flex-col gap-8">

                {/* Focus areas — subjects that need review */}
                {weaknesses.length > 0 && (
                  <div className="bg-white dark:bg-[#151B2B] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-2xl font-bold">نقاط تحتاج إلى تقوية</h3>
                      <span className="text-2xl" aria-hidden>🎯</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                      أقل المواد في درجات اختباراتك — راجعها لرفع مستواك.
                    </p>
                    <div className="space-y-4">
                      {weaknesses.map((w) => {
                        const low = w.avgScore < 50;
                        const barColor = low ? "bg-rose-500" : "bg-amber-500";
                        const scoreColor = low ? "text-rose-500" : "text-amber-500";
                        return (
                          <div key={w.subject} className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                <span className="font-bold truncate">{w.subject}</span>
                                <span className={`font-black text-sm shrink-0 ${scoreColor}`}>
                                  {w.avgScore}%
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                                  style={{ width: `${Math.max(w.avgScore, 4)}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {w.course.title} · {w.quizCount} {w.quizCount === 1 ? "اختبار" : "اختبارات"}
                              </p>
                            </div>
                            <Link
                              href={`/courses/${w.course.id}/learn`}
                              className="shrink-0 px-4 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold text-xs hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
                            >
                              راجع الآن
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Continue Learning */}
                <div className="bg-white dark:bg-[#151B2B] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">واصل التعلم</h3>
                    <Link href="/courses" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700">
                      عرض الكل
                    </Link>
                  </div>
                  
                  {courses.length === 0 && plans.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">📭</div>
                      <h4 className="text-lg font-bold mb-2">مكتبتك فارغة</h4>
                      <p className="text-gray-500 text-sm mb-4">لم تنضم إلى أي كورس أو خطة بعد.</p>
                      <div className="flex gap-2 justify-center">
                        <Link href="/courses" className="px-6 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-colors">
                          تصفح الكورسات
                        </Link>
                        <Link href="/plans" className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                          تصفح الخطط
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {plans.map(p => {
                        return (
                          <div key={p.id} className="group relative">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">خطة دراسية</span>
                                  <h4 className="font-bold text-lg">{p.title}</h4>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{p.educationalStage}</p>
                              </div>
                              <Link href={`/plans/${p.id}/learn`} className="shrink-0 px-5 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold text-sm flex items-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                متابعة
                              </Link>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm font-medium mb-1">
                              <span className="w-12">{p.progressPercent}%</span>
                              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${p.progressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-left flex items-center justify-end gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              {p.completedLessons} من {p.totalLessons} درس مكتمل
                            </div>
                            
                            <div className="absolute -bottom-3 left-0 right-0 h-px bg-gray-100 dark:bg-gray-800 group-last:hidden"></div>
                          </div>
                        );
                      })}
                      {courses.map((course: Course) => {
                        const tVideos = course.folders?.reduce((a, f) => a + f.videos.length, 0) || 1;
                        const wVideos = course.folders?.reduce((a, f) => a + f.videos.filter(v => v.watched).length, 0) || 0;
                        const progress = Math.round((wVideos / Math.max(tVideos, 1)) * 100);
                        
                        return (
                          <div key={course.id} className="group relative">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                              <div>
                                <h4 className="font-bold text-lg">{course.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{course.subject}</p>
                              </div>
                              <Link href={`/courses/${course.id}/learn`} className="shrink-0 px-5 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold text-sm flex items-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                متابعة
                              </Link>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm font-medium mb-1">
                              <span className="w-12">{progress}%</span>
                              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-left flex items-center justify-end gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              {wVideos} من {tVideos} درس مكتمل
                            </div>
                            
                            {/* Divider line except for last item */}
                            <div className="absolute -bottom-3 left-0 right-0 h-px bg-gray-100 dark:bg-gray-800 group-last:hidden"></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Activity Graph */}
                <div className="bg-white dark:bg-[#151B2B] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
                  <h3 className="text-xl font-bold mb-6">نشاطك التعليمي</h3>
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-7 gap-2">
                      {activitySquares.map((intensity, i) => {
                        // Subtle, low-opacity tints — "entered" days glow softly,
                        // heavier activity fills in more (never full saturation).
                        let bgColor = "bg-gray-100 dark:bg-gray-800/60";
                        if (intensity === 1) bgColor = "bg-purple-400/20 dark:bg-purple-400/15";
                        if (intensity === 2) bgColor = "bg-purple-400/40 dark:bg-purple-400/35";
                        if (intensity === 3) bgColor = "bg-purple-500/60 dark:bg-purple-500/55";
                        if (intensity === 4) bgColor = "bg-purple-500/80 dark:bg-purple-500/75";
                        
                        return (
                          <div 
                            key={i} 
                            className={`aspect-square rounded-xl ${bgColor} transition-colors hover:ring-2 hover:ring-purple-400`}
                            title={`مستوى النشاط: ${intensity}`}
                          ></div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center mt-4 text-xs text-gray-500 dark:text-gray-400 font-medium px-2">
                      <div className="flex items-center gap-2">
                        أقل
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800/60"></div>
                          <div className="w-3 h-3 rounded-sm bg-purple-400/20"></div>
                          <div className="w-3 h-3 rounded-sm bg-purple-500/60"></div>
                          <div className="w-3 h-3 rounded-sm bg-purple-500/80"></div>
                        </div>
                        أكثر
                      </div>
                      <div>آخر 4 أسابيع</div>
                    </div>
                  </div>
                </div>
                
              </div>

              {/* Left Column (Narrow) */}
              <div className="lg:col-span-4 flex flex-col gap-8">
                {/* Study Guide Card */}
                <div className="relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br from-[var(--brand-strong)] to-[#073a35] text-white border-0 shadow-lg shadow-[var(--brand-shadow)] flex flex-col justify-between min-h-[220px]">
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "24px 24px" }}></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white text-2xl shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V4H8M4 12a8 8 0 0 1 8-8 8 8 0 0 1 8 8 8 8 0 0 1-8 8c-2 0-3.5-.5-5-2" /><circle cx="12" cy="12" r="2" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <h3 className="text-lg font-head font-black text-white mb-0.5">المرشد الدراسي الذكي</h3>
                        <p className="text-xs text-[#bfe0db] font-medium">اسأل عن أي مفهوم أو مسألة صعبة</p>
                      </div>
                    </div>
                  </div>
                  <Link href="/ai-study" className="relative z-10 w-full py-3.5 rounded-2xl bg-[var(--gold-2)] hover:bg-[var(--gold)] text-[#3a2a06] hover:text-white font-head font-black flex items-center justify-center gap-2 shadow-md transition-all duration-200">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    ابدأ محادثة
                  </Link>
                </div>

                {/* Daily Streak */}
                <div className="bg-white dark:bg-[#151B2B] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">سلسلة المواظبة</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">سجّل دخولك يومياً</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`relative w-20 h-20 shrink-0 rounded-2xl flex flex-col items-center justify-center ${streak > 0 ? "bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <svg className={`w-7 h-7 ${streak > 0 ? "text-white" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2s4 4 4 8a4 4 0 11-8 0c0-1 .5-2 1-3 0 0-3 2-3 6a6 6 0 0012 0c0-5-6-11-6-11z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black ${streak > 0 ? "text-orange-500" : "text-gray-400"}`}>{streak}</span>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{streak === 1 ? "يوم متتالي" : "أيام متتالية"}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {streak === 0 ? "ابدأ سلسلتك اليوم! 🔥" : streak >= 7 ? "مواظبة رائعة! استمر 💪" : "واصل الدخول يومياً للحفاظ على سلسلتك"}
                      </p>
                    </div>
                  </div>
                  {/* Last 7 days (oldest → today), with real weekday initials */}
                  <div className="flex items-center justify-between gap-1.5 mt-5">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const dayLetters = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // Sun..Sat
                      const date = new Date(Date.now() - (6 - i) * 86400000);
                      const isToday = i === 6;
                      const active = stats?.weekActive?.[i] ?? false;
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                          <div className={`w-full aspect-square rounded-lg flex items-center justify-center ${active ? "bg-orange-500/90 text-white" : `bg-gray-100 dark:bg-gray-800 text-gray-400 ${isToday ? "ring-2 ring-orange-400/50" : ""}`}`}>
                            {active ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : <span className="text-[10px]">{dayLetters[date.getDay()]}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Achievements */}
                <div className="bg-white dark:bg-[#151B2B] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">الإنجازات</h3>
                    <span className="text-sm font-bold text-purple-500">{realAchievements} / {achievements.length || 6}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {achievements.map((a) => {
                      const colors: Record<string, string> = {
                        "first-steps": "from-emerald-400 to-teal-600",
                        "fast-learner": "from-cyan-400 to-blue-600",
                        "streak-7": "from-orange-400 to-red-500",
                        "quiz-star": "from-amber-400 to-yellow-500",
                        "dedicated": "from-fuchsia-500 to-purple-600",
                        "expert": "from-purple-500 to-indigo-600",
                      };
                      return (
                        <div
                          key={a.id}
                          title={`${a.title} — ${a.description}`}
                          className={`aspect-square rounded-2xl relative flex flex-col items-center justify-center gap-1.5 p-1.5 transition-all ${a.unlocked ? `bg-gradient-to-br ${colors[a.id] ?? "from-purple-500 to-indigo-600"} shadow-md` : "bg-gray-100 dark:bg-gray-800 opacity-60 grayscale"}`}
                        >
                          {a.unlocked && (
                            <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-white/25 rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
                          )}
                          <svg className={`w-7 h-7 ${a.unlocked ? "text-white" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{ACH_ICON[a.icon]}</svg>
                          <span className={`text-[9px] font-bold text-center leading-tight ${a.unlocked ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>{a.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Goal */}
                <div className="bg-white dark:bg-[#151B2B] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center">
                  <h3 className="text-xl font-bold mb-6 w-full text-right">هدف الأسبوع</h3>
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-gray-100 dark:bg-gray-800" strokeWidth="10" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-purple-500" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * Math.min(realHours / Math.max(realHours + 5, 10), 1))} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black">{Math.round(Math.min(realHours / Math.max(realHours + 5, 10), 1) * 100)}%</span>
                      <span className="text-xs text-gray-500">مكتمل</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold mt-2">{realHours} من {Math.max(realHours + 5, 10)} ساعة مكتملة</p>
                  <p className="text-xs text-gray-500 mt-1">أنت تبلي بلاءً حسناً!</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
    </ProfileGuard>
  );
}
