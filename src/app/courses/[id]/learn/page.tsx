"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { useToast } from "@/components/ui/Toast";

type CourseData = {
  id: string;
  title: string;
  subject: string;
  description?: string | null;
  teacher: { id: string; name: string };
  homeworkUrl?: string | null;
  maxWatchCount?: number;
  folders: Array<{
    id: string;
    name: string;
    videos: Array<{
      id: string;
      title: string;
      progress?: Array<{ watched: boolean }>;
    }>;
    materials: Array<{
      id: string;
      title: string;
      url: string;
      type: string;
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

type WatchCountData = {
  courseId: string;
  maxWatchCount: number;
  usedWatches: number;
  remainingWatches: number;
};

function WatchPipBar({ used, total }: { used: number; total: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">المشاهدات المستخدمة</span>
        <span className="text-xs font-mono text-slate-600">{used}/{total}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            used >= total ? "bg-red-500" : used >= total - 1 ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${total > 0 ? (used / total) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        {used < total ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {total - used} مشاهدة متبقية
          </span>
        ) : (
          <span className="text-red-500 font-semibold">استنفذت جميع المحاولات!</span>
        )}
      </p>
    </div>
  );
}

function WatchConfirmModal({
  videoTitle,
  usedWatches,
  totalWatches,
  onConfirm,
  onCancel,
  isLoading,
}: {
  videoTitle: string;
  usedWatches: number;
  totalWatches: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
          📺
        </div>

        <h2 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">
          هل تريد مشاهدة هذا الفيديو؟
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-center text-sm mb-6 leading-relaxed">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{videoTitle}</span>
        </p>

        {/* Watch info */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">⏱️</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                ستستغرق جلسة المشاهدة
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                4 ساعات كاملة — يمكنك مشاهدة الفيديو في أي وقت خلال هذه المدة
              </p>
            </div>
          </div>
          <div className="h-px bg-amber-200 dark:bg-amber-800/50" />
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">🎯</span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                ستستخدم {usedWatches + 1} من {totalWatches} مشاهدة
              </p>
              <WatchPipBar used={usedWatches + 1} total={totalWatches} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جارٍ البدء...
              </>
            ) : (
              <>
                <span>🎬</span>
                ابدأ المشاهدة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseLearningPage() {
  const router = useRouter();
  const { error: toastError } = useToast();
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [watchCount, setWatchCount] = useState<WatchCountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"lectures" | "quizzes">("lectures");
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Watch confirm modal state
  const [watchModalVideoId, setWatchModalVideoId] = useState<string | null>(null);
  const [watchModalVideoTitle, setWatchModalVideoTitle] = useState("");
  const [watchStarting, setWatchStarting] = useState(false);

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

      // Load watch count
      const wcRes = await fetch(`/api/courses/${courseId}/watch-count`);
      if (wcRes.ok) {
        const wcData = await wcRes.json();
        setWatchCount(wcData);
      }
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

  const toggleFolder = (folderId: string) =>
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));

  const lecturesCount = allVideos.length;
  const quizzesCount = allQuizzes.length;

  const openWatchModal = (video: { id: string; title: string }) => {
    setSelectedVideoId(video.id);
    setWatchModalVideoId(video.id);
    setWatchModalVideoTitle(video.title);
  };

  const confirmWatch = async () => {
    if (!watchModalVideoId) return;
    setWatchStarting(true);
    try {
      // POST to start the session (consumes 1 watch slot)
      const res = await fetch(`/api/videos/${watchModalVideoId}/watch`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || "تعذر بدء جلسة المشاهدة");
        setWatchStarting(false);
        setWatchModalVideoId(null);
        return;
      }

      // Navigate with token in URL so refresh re-uses the same session (no duplicate slot consumed)
      router.push(`/courses/${courseId}/watch/${watchModalVideoId}?token=${encodeURIComponent(data.sessionToken)}`);
    } catch {
      toastError("تعذر بدء جلسة المشاهدة");
      setWatchStarting(false);
    }
  };

  const cancelWatch = () => {
    setWatchModalVideoId(null);
    setWatchModalVideoTitle("");
    setWatchStarting(false);
  };

  const hasNoWatches = watchCount ? watchCount.remainingWatches <= 0 : false;

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
            {/* Main content */}
            <section className="lg:col-span-2 space-y-6">
              {/* Course hero */}
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

              {/* Tabs */}
              <div className="flex items-center gap-2 rounded-3xl p-2 border border-white/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg">
                <button onClick={() => setActiveTab("lectures")} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${activeTab === "lectures" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>محاضرات</button>
                <button onClick={() => setActiveTab("quizzes")} className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${activeTab === "quizzes" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>الاختبارات</button>
              </div>

              {/* Homework section */}
              {activeTab === "lectures" && course.homeworkUrl && (
                <div className="rounded-[1.75rem] border border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-5 shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center text-xl">📋</div>
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200 text-sm">واجب منزلي متاح</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">انتقل إلى صفحة الواجب المنزلي</p>
                      </div>
                    </div>
                    <a
                      href={course.homeworkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                    >
                      فتح الواجب ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Watch panel */}
              {activeTab === "lectures" ? (
                <div className="rounded-[1.75rem] border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl p-5 shadow-xl space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      🎬 المحاضرة المحددة
                    </h2>
                    {watchCount && (
                      <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        {watchCount.remainingWatches} مشاهدة متبقية
                      </div>
                    )}
                  </div>

                  {selectedVideo ? (
                    <div className="space-y-4">
                      {/* Video info card */}
                      <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-800/40 p-5 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">
                            🎬
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white leading-snug">{selectedVideo.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              مدة المشاهدة: 4 ساعات • مشاهدة واحدة من رصيدك
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Watch count bar */}
                      {watchCount && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
                          <WatchPipBar used={watchCount.usedWatches} total={watchCount.maxWatchCount} />
                        </div>
                      )}

                      {/* Watch button */}
                      <button
                        onClick={() => openWatchModal(selectedVideo)}
                        disabled={hasNoWatches}
                        className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all ${
                          hasNoWatches
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50"
                        }`}
                      >
                        {hasNoWatches ? (
                          <>
                            <span>🚫</span>
                            استنفذت جميع المحاولات — تواصل مع المدرس
                          </>
                        ) : (
                          <>
                            <span className="text-xl">▶</span>
                            مشاهدة المحاضرة
                          </>
                        )}
                      </button>

                      {/* Watch info hint */}
                      <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
                        <span className="shrink-0 mt-0.5">💡</span>
                        <p>
                          كل مشاهدة تمنحك 4 ساعات كاملة — يمكنك إيقاف الفيديو والعودة في أي وقت خلال هذه المدة.
                          {watchCount && ` أنت الآن تملك ${watchCount.remainingWatches} مشاهدة متبقية.`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">لا توجد محاضرات في هذا الكورس بعد.</p>
                  )}
                </div>
              ) : (
                /* Quizzes tab */
                <div className="rounded-[1.75rem] border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl p-5 shadow-xl space-y-4">
                  <h2 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                    📝 الاختبار المحدد
                  </h2>
                  {selectedQuiz ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-5 border border-emerald-100 dark:border-emerald-800/50">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-xl shrink-0">
                            📝
                          </div>
                          <div>
                            <p className="font-bold text-emerald-900 dark:text-emerald-200">{selectedQuiz.title}</p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                              مدة الاختبار: {selectedQuiz.timeLimitMinutes} دقيقة
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/quizzes/${selectedQuiz.id}`)}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>✍️</span>
                        ابدأ الاختبار الآن
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">لا يوجد اختبارات في هذا الكورس بعد.</p>
                  )}
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="rounded-[1.75rem] p-4 border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-slate-900 dark:text-white">محتوى الكورس</h2>
                  <span className="text-xs text-slate-500">{activeTab === "lectures" ? "محاضرات" : "اختبارات"}</span>
                </div>

                {/* Watch count mini bar */}
                {watchCount && activeTab === "lectures" && (
                  <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5">
                    <WatchPipBar used={watchCount.usedWatches} total={watchCount.maxWatchCount} />
                  </div>
                )}

                <div className="space-y-4 max-h-[65vh] overflow-auto pr-1">
                  {course.folders.map((folder) => (
                    <div key={folder.id} className="space-y-2">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-300 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        <span>📁 {folder.name}</span>
                        <span className={theme.accent}>{collapsedFolders[folder.id] ? "▸" : "▾"}</span>
                      </button>
                      {!collapsedFolders[folder.id] && (
                        <div className="space-y-1">
                          {(activeTab === "lectures" ? folder.videos : folder.quizzes).map((item) => {
                            if (activeTab === "lectures") {
                              const video = item as (typeof folder.videos)[number];
                              const isSelected = selectedVideoId === video.id;
                              return (
                                <div key={video.id} className="space-y-1">
                                  <button
                                    onClick={() => setSelectedVideoId(video.id)}
                                    className={`w-full text-right px-3 py-2 rounded-xl text-sm border transition-all ${isSelected ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300"}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{video.progress?.some((p) => p.watched) ? "✅" : "🎬"}</span>
                                      <span className="truncate flex-1">{video.title}</span>
                                    </div>
                                  </button>
                                  {isSelected && !hasNoWatches && (
                                    <button
                                      onClick={() => openWatchModal(video)}
                                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                      <span>▶</span>
                                      مشاهدة
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            const quiz = item as (typeof folder.quizzes)[number];
                            return (
                              <button
                                key={quiz.id}
                                onClick={() => setSelectedQuizId(quiz.id)}
                                className={`w-full text-right px-3 py-2 rounded-xl text-sm border transition-all ${selectedQuizId === quiz.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300"}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>📝</span>
                                  <span className="truncate flex-1">{quiz.title}</span>
                                  <span className="text-xs text-slate-400 shrink-0">{quiz.timeLimitMinutes}د</span>
                                </div>
                              </button>
                            );
                          })}
                          {activeTab === "lectures" && folder.materials && folder.materials.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/50 mt-2 space-y-1">
                              <p className="text-xs font-bold text-slate-500 mb-2 px-2">ملحقات المحاضرة</p>
                              {folder.materials.map(m => (
                                <a
                                  key={m.id}
                                  href={m.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full text-right px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center gap-2"
                                >
                                  <span>{m.type === "pdf" ? "📄" : "🔗"}</span>
                                  <span className="truncate flex-1">{m.title}</span>
                                </a>
                              ))}
                            </div>
                          )}
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

      {/* Watch confirmation modal */}
      {watchModalVideoId && (
        <WatchConfirmModal
          videoTitle={watchModalVideoTitle}
          usedWatches={watchCount?.usedWatches ?? 0}
          totalWatches={watchCount?.maxWatchCount ?? 3}
          onConfirm={confirmWatch}
          onCancel={cancelWatch}
          isLoading={watchStarting}
        />
      )}
    </div>
  );
}
