"use client";
import { useState, useEffect, useCallback } from "react";
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [filters, setFilters] = useState({ stage: "", teacher: "", search: "" });

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
    if (filters.stage) params.set("stage", filters.stage);
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

      // Extract unique teachers safely
      const uniqueTeachers: { id: string; name: string }[] = [];
      const seenIds = new Set<string>();
      
      for (const c of nextCourses) {
        if (c.teacher?.id && !seenIds.has(c.teacher.id)) {
          uniqueTeachers.push(c.teacher);
          seenIds.add(c.teacher.id);
        }
      }
      
      setTeachers(uniqueTeachers);
    } catch (err: any) {
      console.error("Fetch courses error:", err);
      setCourses([]);
      setTeachers([]);
      setError(err.message || "حدث خطأ أثناء تحميل الكورسات");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      await fetchCourses();
    };
    load();
  }, [fetchCourses]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0B0F19]">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold mb-6 border border-indigo-100 dark:border-indigo-500/20">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
             استكشف مكتبتنا
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 dark:text-white tracking-tight">
            مكتبة <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">الدورات</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            اختر من بين مجموعة متنوعة من الدورات المصممة خصيصاً لتطوير مهاراتك العلمية والعملية
          </p>
        </div>

        {/* Filters Card */}
        <div className="bg-white dark:bg-[#151B2B] rounded-[2rem] p-8 mb-10 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Search Bar */}
            <div className="mb-8 relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="ابحث عن دورة..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-4 pr-12 py-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0F141F] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
              />
            </div>

            <div className="space-y-6">
              {/* Level Filter */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-gray-300 font-bold md:w-32 shrink-0">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  المستوى
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, stage: "" })}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      filters.stage === ""
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                    }`}
                  >
                    الكل
                  </button>
                  {EDUCATIONAL_STAGES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setFilters({ ...filters, stage: s.value })}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        filters.stage === s.value
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                      }`}
                    >
                      {s.label.split(" (")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher Filter */}
              {teachers.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-gray-300 font-bold md:w-32 shrink-0">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    المعلم
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilters({ ...filters, teacher: "" })}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        filters.teacher === ""
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                      }`}
                    >
                      الكل
                    </button>
                    {teachers.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setFilters({ ...filters, teacher: t.id })}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          filters.teacher === t.id
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                            : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights for logged-in students */}
        {user?.role === "student" && (
          <div className="mb-6">
            <StudentInsights compact />
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {courses.length} كورس متاح
          </p>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Courses grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : courses.length > 0
              ? courses.map((course) => <CourseCard key={course.id} course={course} onCodeApplied={fetchCourses} />)
              : (
                <div className="col-span-full text-center py-20 text-gray-400">
                  <div className="text-6xl mb-6">📚</div>
                  <p className="text-xl font-medium">لا توجد كورسات بهذه المعايير</p>
                  <p className="text-sm mt-2">جرب تغيير الفلاتر</p>
                </div>
              )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
