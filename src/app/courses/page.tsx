"use client";
import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { CourseCard } from "@/components/courses/CourseCard";
import { StudentInsights } from "@/components/ai/StudentInsights";
import { EDUCATIONAL_STAGES, SUBJECTS } from "@/types";

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
  const [filters, setFilters] = useState({ stage: "", subject: "", teacher: "" });

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
    if (filters.subject) params.set("subject", filters.subject);
    if (filters.teacher) params.set("teacher", filters.teacher);
    try {
      const res = await fetch(`/api/courses?${params}`);
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء تحميل الكورسات");
      }

      const nextCourses = data.courses || [];
      setCourses(nextCourses);
      // Extract unique teachers
      const ts = Array.from(new Map(nextCourses.map((c: Course) => [c.teacher.id, c.teacher])).values()) as { id: string; name: string }[];
      setTeachers(ts);
    } catch (err) {
      console.error(err);
      setCourses([]);
      setTeachers([]);
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الكورسات");
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">الكورسات</h1>
          <p className="text-gray-500 dark:text-gray-400">اكتشف مجموعة متنوعة من الكورسات المميزة</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">كل المراحل</option>
              {EDUCATIONAL_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">كل المواد</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filters.teacher}
              onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">كل المدرسين</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
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
                <div className="col-span-full text-center py-16 text-gray-400">
                  <div className="text-6xl mb-4">📚</div>
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
