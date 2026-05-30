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

export default function LibraryPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, coursesRes] = await Promise.all([
        fetch("/api/auth/me", { 
          credentials: "include",
          headers: { "Accept": "application/json" }
        }),
        fetch("/api/courses/enrolled", { 
          credentials: "include",
          headers: { "Accept": "application/json" }
        }),
      ]);

      if (userRes.ok) {
        const userData = (await userRes.json()) as { user?: { name: string; role: string } };
        setUser(userData.user || null);
      }

      if (coursesRes.ok) {
        const coursesData = (await coursesRes.json()) as {
          success: boolean;
          enrolledCourses: Course[];
        };
        if (coursesData.success) {
          setCourses(coursesData.enrolledCourses ?? []);
        }
      } else if (coursesRes.status === 401) {
        setCourses([]);
      } else {
        console.error("Library enrolled API:", coursesRes.status, await coursesRes.text());
        setCourses([]);
      }
    } catch (error) {
      console.error("Error fetching library data:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("library-refresh")) {
      sessionStorage.removeItem("library-refresh");
    }

    const timer = setTimeout(() => {
      void loadLibrary();
    }, 0);

    return () => clearTimeout(timer);
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

  return (
    <ProfileGuard>
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">مكتبتي</h1>
          <p className="text-gray-500 dark:text-gray-400">كورساتك المفعّلة</p>
        </motion.div>

        {/* Stats */}
        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "الكورسات", value: courses.length, icon: "📚" },
              { label: "الفيديوهات", value: totalVideos, icon: "🎬" },
              { label: "الاختبارات", value: totalQuizzes, icon: "📝" },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center border border-gray-100 dark:border-gray-700">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Courses list */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">مكتبتك فارغة</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">لم تنضم إلى أي كورس بعد. استخدم كود الوصول من مدرسك</p>
                <Link href="/courses" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  تصفح الكورسات
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.map((course: Course) => (
                  <Link key={course.id} href={`/courses/${course.id}`} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all block">
                    <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
                      {course.thumbnailUrl && (
                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                      )}
                      {!course.thumbnailUrl && (
                        <div className="w-full h-full flex items-center justify-center text-5xl">📚</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">👨‍🏫 {course.teacher.name}</p>
                      <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                        <span>{course.folders.length} محاضرة</span>
                        <span>•</span>
                        <span>{course.folders.reduce((a: number, f: typeof course.folders[0]) => a + f.videos.length, 0)} فيديو</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </ProfileGuard>
  );
}
