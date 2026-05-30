"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { BunnyPlayer } from "@/components/player/BunnyPlayer";
import { useToast } from "@/components/ui/Toast";

type CourseData = {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  teacher: { id: string; name: string };
  folders: Array<{
    id: string;
    name: string;
    videos: Array<{
      id: string;
      title: string;
      progress?: Array<{ watched: boolean }>;
    }>;
    quizzes: Array<{
      id: string;
      title: string;
      timeLimitMinutes: number;
      questions: Array<{
        id: string;
        question: string;
        optionA: string;
        optionB: string;
        optionC: string;
        optionD: string;
      }>;
    }>;
  }>;
};

export default function CourseLearningPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [secureEmbedUrl, setSecureEmbedUrl] = useState<string | null>(null);
  const [embedFallbackUrl, setEmbedFallbackUrl] = useState<string | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const [activeTab, setActiveTab] = useState<"lectures" | "quizzes">("lectures");
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const theme = useMemo(() => {
    const subject = (course?.subject || "").toLowerCase();
    if (subject.includes("رياض") || subject.includes("math")) {
      return {
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
        panel: "from-emerald-500 via-cyan-500 to-blue-600",
        accent: "text-emerald-700 dark:text-emerald-300",
      };
    }
    if (subject.includes("فيزياء") || subject.includes("physics")) {
      return {
        badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
        panel: "from-indigo-500 via-sky-500 to-cyan-600",
        accent: "text-indigo-700 dark:text-indigo-300",
      };
    }
    if (subject.includes("كيمياء") || subject.includes("chem")) {
      return {
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        panel: "from-amber-500 via-orange-500 to-red-500",
        accent: "text-amber-700 dark:text-amber-300",
      };
    }
    return {
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      panel: "from-blue-500 via-indigo-500 to-violet-600",
      accent: "text-blue-700 dark:text-blue-300",
    };
  }, [course?.subject]);

  const allVideos = useMemo(() => course?.folders.flatMap((f) => f.videos) ?? [], [course]);
  const allQuizzes = useMemo(() => course?.folders.flatMap((f) => f.quizzes) ?? [], [course]);

  const selectedVideo = allVideos.find((v) => v.id === selectedVideoId) ?? null;
  const selectedQuiz = allQuizzes.find((q) => q.id === selectedQuizId) ?? null;

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.replace("/login"); return; }
        if (res.status === 403) { router.replace(`/courses/${courseId}`); return; }
        throw new Error(data.error || "فشل تحميل الكورس");
      }
      const nextCourse = data.course as CourseData;
      setCourse(nextCourse);
      const firstVideo = nextCourse.folders.flatMap((f) => f.videos)[0];
      const firstQuiz = nextCourse.folders.flatMap((f) => f.quizzes)[0];
      setSelectedVideoId(firstVideo?.id ?? null);
      setSelectedQuizId(firstQuiz?.id ?? null);
      const initialCollapse: Record<string, boolean> = {};
      nextCourse.folders.forEach((folder, index) => { initialCollapse[folder.id] = index !== 0; });
      setCollapsedFolders(initialCollapse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الكورس");
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user ? { name: d.user.name, role: d.user.role } : null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const run = async () => { if (courseId) await loadCourse(); };
    run();
  }, [courseId, loadCourse]);

  useEffect(() => {
    const loadSecureVideo = async () => {
      if (!selectedVideoId) { setSecureEmbedUrl(null); setEmbedFallbackUrl(null); return; }
      setPlayerLoading(true);
      setPlayerError("");
      try {
        const res = await fetch(`/api/videos/${selectedVideoId}/secure-url`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تحميل الفيديو");
        setSecureEmbedUrl(data.embedUrl);
        setEmbedFallbackUrl(data.fallbackEmbedUrl || null);
      } catch (err) {
        setSecureEmbedUrl(null); setEmbedFallbackUrl(null);
        setPlayerError(err instanceof Error ? err.message : "تعذر تحميل الفيديو");
      } finally { setPlayerLoading(false); }
    };
    loadSecureVideo();
  }, [selectedVideoId]);

  const markVideoWatched = async () => {
    if (!selectedVideo) return;
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: selectedVideo.id, watched: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تحديث التقدم");
      toastSuccess("تم تسجيل مشاهدة المحاضرة بنجاح");
      loadCourse();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التقدم");
    }
  };

  const toggleFolder = (folderId: string) =>
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));

  const lecturesCount = allVideos.length;
  const quizzesCount = allQuizzes.length;

  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_38%,#f7fafc_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.2),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-16 text-gray-500">جارٍ تحميل الكورس...</div>
        ) : error ? (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 border border-red-200 dark:border-red-900/40 text-center">
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <button onClick={() => router.push("/courses")} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
              الرجوع إلى الكورسات
            </button>
          </div>
        ) : course ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 space-y-6">
              <div className={`relative overflow-hidden rounded-[2rem] p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.5)] bg-gradient-to-r ${theme.panel} text-white`}>
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,_white,_transparent_40%)]" />
                <div className="relative">
                  <h1 className="text-3xl font-black">{course.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-sm text-white/90">👨‍🏫 {course.teacher.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${theme.badge}`}>{course.subject}</span>
                  </div>
                  {course.description && <p className="text-sm text-white/90 mt-3 max-w-2xl leading-7">{course.description}</p>}
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/85">
                    <span className="rounded-full bg-white/10 px-3 py-1">{lecturesCount} محاضرة</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">{quizzesCount} اختبار</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-3xl p-2 border border-white/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg">
                <button onClick={() => setActiveTab("lectures")} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${activeTab === "lectures" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>محاضرات</button>
                <button onClick={() => setActiveTab("quizzes")} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${activeTab === "quizzes" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>الاختبارات</button>
              </div>

              {flashMessage && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${flashMessage.type === "success" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/40" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40"}`}>{flashMessage.text}</div>
              )}

              {activeTab === "lectures" ? (
                <div className="rounded-[1.75rem] border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl p-4 shadow-xl space-y-4">
                  <h2 className="font-black text-slate-900 dark:text-white text-lg">🎬 المحاضرة المختارة</h2>
                  {selectedVideo ? (
                    <>
                      {playerLoading && <p className="text-sm text-slate-500">جارٍ تجهيز رابط آمن للفيديو...</p>}
                      {playerError && <p className="text-sm text-rose-600">{playerError}</p>}
                      {secureEmbedUrl && <BunnyPlayer embedUrl={secureEmbedUrl} fallbackEmbedUrl={embedFallbackUrl || undefined} title={selectedVideo.title} />}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{selectedVideo.title}</p>
                          <p className="text-xs text-slate-500">بعد المشاهدة يتم تسجيل التقدم.</p>
                        </div>
                        <button onClick={markVideoWatched} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold">تم مشاهدة الفيديو ✅</button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">لا يوجد فيديوهات في هذا الكورس حتى الآن.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl p-5 shadow-xl space-y-4">
                  <h2 className="font-black text-slate-900 dark:text-white text-lg">📝 الاختبار المختار</h2>
                  {selectedQuiz ? (
                    <>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{selectedQuiz.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">مدة الاختبار: {selectedQuiz.timeLimitMinutes} دقيقة.</p>
                      </div>
                      <button onClick={() => router.push(`/quizzes/${selectedQuiz.id}`)} className="px-5 py-3 bg-slate-900 hover:bg-slate-700 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold">ابدأ الاختبار الآن</button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">لا يوجد اختبارات في هذا الكورس حتى الآن.</p>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-[1.75rem] p-4 border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-slate-900 dark:text-white">محتوى الكورس</h2>
                  <span className="text-xs text-slate-500">{activeTab === "lectures" ? "محاضرات" : "اختبارات"}</span>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
                  {course.folders.map((folder) => (
                    <div key={folder.id} className="space-y-2">
                      <button onClick={() => toggleFolder(folder.id)} className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70">
                        <span>📁 {folder.name}</span>
                        <span className={theme.accent}>{collapsedFolders[folder.id] ? "▸" : "▾"}</span>
                      </button>
                      {!collapsedFolders[folder.id] && (
                        <div className="space-y-1">
                          {(activeTab === "lectures" ? folder.videos : folder.quizzes).map((item) => {
                            if (activeTab === "lectures") {
                              const video = item as (typeof folder.videos)[number];
                              return (
                                <button key={video.id} onClick={() => setSelectedVideoId(video.id)} className={`w-full text-right px-3 py-2 rounded-xl text-sm border transition-all ${selectedVideoId === video.id ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300"}`}>
                                  🎬 {video.title} {video.progress?.some((p) => p.watched) ? "✅" : ""}
                                </button>
                              );
                            }
                            const quiz = item as (typeof folder.quizzes)[number];
                            return (
                              <button key={quiz.id} onClick={() => { setSelectedQuizId(quiz.id); setFlashMessage(null); }} className={`w-full text-right px-3 py-2 rounded-xl text-sm border transition-all ${selectedQuizId === quiz.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300"}`}>
                                📝 {quiz.title}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
