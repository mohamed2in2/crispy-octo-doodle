"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type VideoSource = {
  id: string;
  isDefault: boolean;
  video?: {
    id: string;
    title: string;
    durationMinutes: number;
    folder?: {
      courseId: string;
    };
  };
};

type Quiz = {
  id: string;
  title: string;
};

type Lesson = {
  id: string;
  title: string;
  order: number;
  unlocked: boolean;
  requiresQuiz: boolean;
  requiresHomework: boolean;
  hasProject: boolean;
  sources: VideoSource[];
  quizzes: Quiz[];
  homeworks: Array<{ id: string; title: string; content?: string }>;
  progress: {
    watched: boolean;
    chosenSourceId?: string | null;
    quizPassed: boolean;
    quizScore?: number | null;
    homeworkPassed: boolean;
    projectPassed: boolean;
    projectGrade?: number | null;
  } | null;
  homeworkSubmissions: Array<{
    id: string;
    status: string;
    content?: string;
    fileUrl?: string;
  }>;
  projectSubmissions: Array<{
    id: string;
    status: string;
    grade?: number | null;
    feedback?: string | null;
    content?: string;
    fileUrl?: string;
  }>;
};

type PlanData = {
  id: string;
  title: string;
  description?: string;
  educationalStage: string;
  chatEnabled: boolean;
};

type ChatMessage = {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PlanLearnPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const planId = params.id;
  const { success: toastSuccess, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Sidebar / UI states
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Video playback session state
  const [activeVideoSource, setActiveVideoSource] = useState<VideoSource | null>(null);
  const [playerSession, setPlayerSession] = useState<{
    embedUrl: string;
    sessionToken: string;
    provider: string;
  } | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);

  // Homework & Project submission states
  const [homeworkText, setHomeworkText] = useState("");
  const [homeworkUrl, setHomeworkUrl] = useState("");
  const [submittingHw, setSubmittingHw] = useState(false);

  const [projectText, setProjectText] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [submittingProject, setSubmittingProject] = useState(false);

  // AI Assistant Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "أهلاً بك! أنا مساعدك الدراسي الذكي. اسألني أي سؤال حول دروس هذه الخطة.", timestamp: new Date().toLocaleTimeString("ar-EG") }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Load Roadmap data ──
  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/roadmap`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push(`/plans/${planId}`);
          return;
        }
        throw new Error(data.error || "تعذر تحميل الخطة");
      }
      setPlan(data.plan);
      setLessons(data.lessons || []);

      // Preserve or set initial selected lesson
      if (data.lessons && data.lessons.length > 0) {
        setSelectedLessonId((prev) => {
          if (prev && data.lessons.some((l: Lesson) => l.id === prev)) return prev;
          // Default to the first unlocked lesson that is not fully completed
          const firstIncomplete = data.lessons.find((l: Lesson) => l.unlocked && (!l.progress || !l.progress.watched));
          return firstIncomplete ? firstIncomplete.id : data.lessons[0].id;
        });
      }
    } catch (err: any) {
      toastError(err.message || "حدث خطأ أثناء تحميل مسار الخطة");
    } finally {
      setLoading(false);
    }
  }, [planId, router, toastError]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => setUser(d.user ? { name: d.user.name, role: d.user.role } : null))
      .catch(() => setUser(null));

    void fetchRoadmap();
  }, [planId, fetchRoadmap]);

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);

  // ── Auto-select/load Video Source ──
  useEffect(() => {
    if (!selectedLesson) {
      setActiveVideoSource(null);
      setPlayerSession(null);
      return;
    }

    const progress = selectedLesson.progress;
    const sources = selectedLesson.sources || [];

    // Find chosen or default source
    let source = sources.find(s => s.id === progress?.chosenSourceId);
    if (!source) source = sources.find(s => s.isDefault);
    if (!source && sources.length > 0) source = sources[0];

    setActiveVideoSource(source || null);
    setPlayerSession(null); // Reset player session to force loading the new source when chosen
  }, [selectedLessonId, lessons, selectedLesson]);

  // ── Initiate Video session ──
  const startVideoSession = async (source: VideoSource) => {
    if (!source.video) return;
    setLoadingPlayer(true);
    try {
      const res = await fetch(`/api/videos/${source.video.id}/watch`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setPlayerSession({
          embedUrl: data.embedUrl,
          sessionToken: data.sessionToken,
          provider: data.provider || "vdocipher"
        });
      } else {
        toastError(data.error || "فشل بدء تشغيل الفيديو");
      }
    } catch {
      toastError("تعذر بدء تشغيل الفيديو");
    } finally {
      setLoadingPlayer(false);
    }
  };

  // ── Choose Video Source ──
  const chooseSource = async (sourceId: string) => {
    if (!selectedLessonId) return;
    try {
      const res = await fetch(`/api/plans/${planId}/lessons/${selectedLessonId}/choose-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
        credentials: "include"
      });
      if (res.ok) {
        toastSuccess("تم حفظ اختيارك للمصدر بنجاح");
        void fetchRoadmap();
      } else {
        const d = await res.json();
        toastError(d.error || "فشل اختيار المصدر");
      }
    } catch {
      toastError("حدث خطأ أثناء حفظ المصدر");
    }
  };

  // ── Complete Video Watch ──
  const handleVideoEnded = async () => {
    if (!selectedLessonId || !activeVideoSource?.video) return;
    try {
      const res = await fetch(`/api/videos/${activeVideoSource.video.id}/complete`, { method: "POST", credentials: "include" });
      if (res.ok) {
        toastSuccess("تم تسجيل إكمال الفيديو بنجاح! 🎉");
        void fetchRoadmap();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ── Submit Homework ──
  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return;
    if (!homeworkText.trim() && !homeworkUrl.trim()) {
      toastError("الرجاء ملء محتوى الإجابة أو رابط الملف");
      return;
    }
    setSubmittingHw(true);
    try {
      const activeHw = selectedLesson?.homeworks?.[0];
      const res = await fetch(`/api/plans/${planId}/lessons/${selectedLessonId}/homework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planHomeworkId: activeHw?.id,
          content: homeworkText,
          fileUrl: homeworkUrl
        }),
        credentials: "include"
      });
      if (res.ok) {
        toastSuccess("تم تسليم الواجب بنجاح");
        setHomeworkText("");
        setHomeworkUrl("");
        void fetchRoadmap();
      } else {
        const d = await res.json();
        toastError(d.error || "فشل تسليم الواجب");
      }
    } catch {
      toastError("حدث خطأ أثناء تسليم الواجب");
    } finally {
      setSubmittingHw(false);
    }
  };

  // ── Submit Project ──
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId) return;
    if (!projectText.trim() && !projectUrl.trim()) {
      toastError("الرجاء ملء محتوى المشروع أو رابط الملف");
      return;
    }
    setSubmittingProject(true);
    try {
      const res = await fetch(`/api/plans/${planId}/lessons/${selectedLessonId}/submit-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: projectText,
          fileUrl: projectUrl
        }),
        credentials: "include"
      });
      if (res.ok) {
        toastSuccess("تم تسليم المشروع بنجاح! سيتم تقييمه تلقائياً بواسطة الذكاء الاصطناعي.");
        setProjectText("");
        setProjectUrl("");
        void fetchRoadmap();
      } else {
        const d = await res.json();
        toastError(d.error || "فشل تسليم المشروع");
      }
    } catch {
      toastError("حدث خطأ أثناء تسليم المشروع");
    } finally {
      setSubmittingProject(false);
    }
  };

  // ── Send Chat Message ──
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendingChat) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString("ar-EG")
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setSendingChat(true);

    // Scroll to bottom
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch(`/api/plans/${planId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          lessonId: selectedLessonId
        }),
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [...prev, {
          sender: "ai",
          text: data.reply || "عذراً، لم أستطع فهم سؤالك.",
          timestamp: new Date().toLocaleTimeString("ar-EG")
        }]);
      } else {
        toastError(data.error || "فشل إرسال الرسالة");
      }
    } catch {
      toastError("تعذر الاتصال بالمساعد الذكي");
    } finally {
      setSendingChat(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">جاري تحميل مسار الخطة الدراسية...</p>
          </div>
        </main>
      </div>
    );
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <Navbar user={user} />

      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-b border-indigo-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{plan?.title}</h1>
            {plan?.description && (() => {
              let points: string[] = [];
              try {
                if (plan.description.startsWith('[') && plan.description.endsWith(']')) {
                  points = JSON.parse(plan.description);
                }
              } catch {}
              return points.length > 0 ? (
                <div className="flex flex-wrap gap-x-4 text-xs text-slate-300 mt-2">
                  {points.map((p, i) => <span key={i}>• {p}</span>)}
                </div>
              ) : (
                <p className="text-slate-300 text-xs mt-1.5">{plan.description}</p>
              );
            })()}
          </div>
          {plan?.chatEnabled && (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 border-none cursor-pointer transition-colors shadow-lg shadow-indigo-600/25 shrink-0 self-start md:self-auto"
            >
              💬 المساعد الذكي
            </button>
          )}
        </div>
      </div>

      {/* Global CSS to hide scrollbar */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .duo-container {
          --x-offset: 28px;
        }
        @media (min-width: 640px) {
          .duo-container {
            --x-offset: 70px;
          }
        }
        @media (min-width: 1024px) {
          .duo-container {
            --x-offset: 140px;
          }
        }
      `}</style>

      {/* Main Roadmap Area (Centered, Full Page Width) */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center relative duo-container">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6 text-center">🗺️ خريطة التعلم التفاعلية</h2>
        
        {/* Duolingo Winding Map Card */}
        <div className="relative w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 shadow-sm overflow-hidden flex flex-col items-center min-h-[600px]">
          {/* The vertical connection line */}
          <div className="absolute top-8 bottom-8 w-2 bg-slate-100 dark:bg-slate-800 rounded-full left-1/2 -translate-x-1/2" />

          {/* Snaking nodes list (with scrollbar hidden but scrollable) */}
          <div className="relative z-10 w-full flex flex-col items-center gap-16 py-8 max-h-[80vh] overflow-y-auto no-scrollbar pr-1 pl-1">
            {lessons.map((lesson, index) => {
              const active = selectedLessonId === lesson.id;
              const isCompleted = lesson.progress?.watched &&
                (!lesson.requiresQuiz || lesson.progress.quizPassed) &&
                (!lesson.requiresHomework || lesson.progress.homeworkPassed) &&
                (!lesson.hasProject || lesson.progress.projectPassed);

              const multipliers = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6];
              const multiplier = multipliers[index % multipliers.length];

              // Tech decorations to place opposite the nodes
              const DECORATIONS = ["💻", "🧠", "🚀", "☕", "🤖", "✨", "📚", "💡", "⚡", "👾"];
              const decoration = DECORATIONS[index % DECORATIONS.length];

              // Decide node style classes based on completed/active/unlocked status & lesson type
              let btnClass = "";
              let nodeIcon = null;

              if (lesson.hasProject) {
                // Project node - Gold / Chest theme
                if (isCompleted) {
                  btnClass = "bg-amber-500 hover:bg-amber-400 text-white shadow-[0_6px_0_0_#d97706] active:shadow-[0_2px_0_0_#d97706] active:translate-y-[4px]";
                  nodeIcon = <span>🎁</span>;
                } else if (active) {
                  btnClass = "bg-yellow-500 hover:bg-yellow-400 text-white shadow-[0_6px_0_0_#ca8a04] active:shadow-[0_2px_0_0_#ca8a04] active:translate-y-[4px] ring-4 ring-yellow-500/20";
                  nodeIcon = <span>🎁</span>;
                } else if (lesson.unlocked) {
                  btnClass = "bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_6px_0_0_#a16207] active:shadow-[0_2px_0_0_#a16207] active:translate-y-[4px]";
                  nodeIcon = <span>🎁</span>;
                } else {
                  btnClass = "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-[0_6px_0_0_#cbd5e1] dark:shadow-[0_6px_0_0_#0f172a] cursor-not-allowed opacity-50";
                  nodeIcon = <span>🔒</span>;
                }
              } else if (lesson.requiresQuiz) {
                // Quiz node - Dumbbell / Trophy theme
                if (isCompleted) {
                  btnClass = "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_6px_0_0_#047857] active:shadow-[0_2px_0_0_#047857] active:translate-y-[4px]";
                  nodeIcon = <span>🏆</span>;
                } else if (active) {
                  btnClass = "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_6px_0_0_#4338ca] active:shadow-[0_2px_0_0_#4338ca] active:translate-y-[4px] ring-4 ring-indigo-500/20";
                  nodeIcon = <span>🏆</span>;
                } else if (lesson.unlocked) {
                  btnClass = "bg-indigo-500 hover:bg-indigo-450 text-white shadow-[0_6px_0_0_#3730a3] active:shadow-[0_2px_0_0_#3730a3] active:translate-y-[4px]";
                  nodeIcon = <span>🏆</span>;
                } else {
                  btnClass = "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-[0_6px_0_0_#cbd5e1] dark:shadow-[0_6px_0_0_#0f172a] cursor-not-allowed opacity-50";
                  nodeIcon = <span>🔒</span>;
                }
              } else {
                // Normal / Homework lesson
                if (isCompleted) {
                  btnClass = "bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_6px_0_0_#047857] active:shadow-[0_2px_0_0_#047857] active:translate-y-[4px]";
                  nodeIcon = <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
                } else if (active) {
                  btnClass = "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_6px_0_0_#4338ca] active:shadow-[0_2px_0_0_#4338ca] active:translate-y-[4px] ring-4 ring-indigo-500/20";
                  nodeIcon = <span>{index + 1}</span>;
                } else if (lesson.unlocked) {
                  btnClass = "bg-sky-500 hover:bg-sky-400 text-white shadow-[0_6px_0_0_#0369a1] active:shadow-[0_2px_0_0_#0369a1] active:translate-y-[4px]";
                  nodeIcon = <span>{index + 1}</span>;
                } else {
                  btnClass = "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-[0_6px_0_0_#cbd5e1] dark:shadow-[0_6px_0_0_#0f172a] cursor-not-allowed opacity-50";
                  nodeIcon = <span>🔒</span>;
                }
              }

              return (
                <div
                  key={lesson.id}
                  className="relative flex flex-col items-center w-full"
                >
                  {/* Decorative element opposite the node */}
                  {multiplier !== 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 text-2xl sm:text-3xl select-none pointer-events-none opacity-30 dark:opacity-40 animate-pulse hover:opacity-80 transition-all duration-300"
                      style={{
                        transform: `translateX(calc(${-multiplier} * var(--x-offset))) translateY(-50%)`,
                      }}
                    >
                      {decoration}
                    </div>
                  )}

                  {/* Node Wrapper for Offset */}
                  <div
                    className="relative flex flex-col items-center"
                    style={{ transform: `translateX(calc(${multiplier} * var(--x-offset)))` }}
                  >
                    {/* Waving mascot floating above the active node */}
                    {active && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                        <div className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap shadow-md shadow-indigo-600/30">
                          أنت هنا 🎓
                        </div>
                        <div className="w-2 h-2 bg-indigo-600 rotate-45 -mt-1 shadow-md" />
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (lesson.unlocked) {
                          setSelectedLessonId(lesson.id);
                          setIsModalOpen(true);
                        }
                      }}
                      disabled={!lesson.unlocked}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black text-lg transition-all border-none relative cursor-pointer outline-none ${btnClass}`}
                    >
                      {nodeIcon}
                    </button>

                    {/* Lesson Label */}
                    <div className={`mt-2.5 px-3 py-1 rounded-xl text-center shadow-sm border max-w-[120px] transition-all whitespace-nowrap ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold shadow-indigo-100/50 dark:shadow-none"
                        : lesson.unlocked
                        ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                        : "bg-slate-50 dark:bg-slate-950 border-transparent text-slate-400 dark:text-slate-600 text-xs"
                    }`}>
                      <p className="text-[10px] truncate leading-tight">{lesson.title}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modern Lesson Gateways Modal Overlay */}
      {isModalOpen && selectedLesson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto no-scrollbar relative p-6 space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors border-none cursor-pointer text-lg font-bold"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="text-center pt-2">
              <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full uppercase">
                بوابة الدرس
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-2">{selectedLesson.title}</h2>
            </div>

            {/* Gateways Cards list */}
            <div className="space-y-5">
              {/* 1. LECTURE / WATCH GATEWAY */}
              <div className="border border-sky-100 dark:border-sky-950/30 rounded-2xl p-5 bg-sky-50/30 dark:bg-sky-950/10 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎬</span>
                  <div>
                    <h4 className="text-sm font-black text-sky-950 dark:text-sky-400">محاضرة الشرح والمشاهدة</h4>
                    <p className="text-xs text-sky-700/70 dark:text-sky-500/70">شرح المادة العلمية التفاعلي الخاص بالدرس.</p>
                  </div>
                </div>

                {activeVideoSource ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-sky-100 dark:border-sky-900/20">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{activeVideoSource.video?.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{activeVideoSource.video?.durationMinutes} دقيقة</p>
                    </div>

                    <Link
                      href={`/courses/${activeVideoSource.video?.folder?.courseId}/learn?videoId=${activeVideoSource.video?.id}`}
                      className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black rounded-xl text-center block transition-all shadow-md shadow-sky-500/20 hover:scale-[1.01]"
                    >
                      ▶ انتقل إلى قاعة المعلم للمشاهدة ←
                    </Link>
                    
                    {/* Multiple sources switcher */}
                    {selectedLesson.sources.length > 1 && (
                      <div className="pt-2 border-t border-sky-100 dark:border-sky-900/10">
                        <p className="text-[10px] font-bold text-slate-500 mb-1.5">تغيير معلم الشرح أو المصدر:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedLesson.sources.map((s, idx) => (
                            <button
                              key={s.id}
                              onClick={() => { chooseSource(s.id); }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                activeVideoSource?.id === s.id
                                  ? "bg-sky-600 text-white border-sky-600"
                                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {s.video?.title || `مصدر ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">لا يوجد مصدر فيديو محدد للدرس.</p>
                )}
              </div>

              {/* 2. QUIZ PORTAL */}
              {selectedLesson.requiresQuiz && (
                <div className="border border-amber-100 dark:border-amber-950/30 rounded-2xl p-5 bg-amber-50/30 dark:bg-amber-950/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h4 className="text-sm font-black text-amber-950 dark:text-amber-400">الاختبار التقويمي المطلوب</h4>
                      <p className="text-xs text-amber-700/70 dark:text-amber-500/70">قياس فهمك لمحتوى الدرس ونقاط القوة والضعف.</p>
                    </div>
                  </div>

                  {selectedLesson.progress?.quizPassed ? (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                      <span>✓</span>
                      تم اجتياز الاختبار بنجاح (الدرجة: {selectedLesson.progress.quizScore}%)
                    </div>
                  ) : selectedLesson.quizzes?.[0] ? (
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        router.push(`/quizzes/${selectedLesson.quizzes[0].id}`);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-xl text-xs border-none cursor-pointer transition-colors text-center shadow-md shadow-amber-500/10"
                    >
                      ✍️ ابدأ الاختبار التقويمي الآن
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400">لم يتم تعيين اختبار لهذا الدرس بعد.</p>
                  )}
                </div>
              )}

              {/* 3. HOMEWORK PORTAL */}
              {selectedLesson.requiresHomework && (
                <div className="border border-indigo-100 dark:border-indigo-950/30 rounded-2xl p-5 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <div>
                      <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-400">الواجب الدراسي والتطبيق</h4>
                      <p className="text-xs text-indigo-700/70 dark:text-indigo-500/70">حل الأسئلة والتمارين وتسليمها لمراجعتها يدوياً من المعلم.</p>
                    </div>
                  </div>

                  {/* Submissions list */}
                  {selectedLesson.homeworkSubmissions.length > 0 && (() => {
                    const sub = selectedLesson.homeworkSubmissions[0];
                    const labels: Record<string, string> = { pending: "🔍 قيد التدقيق والتقييم من المعلم", passed: "✅ تم قبول الواجب بنجاح", failed: "❌ لم يتم قبول الواجب" };
                    return (
                      <div className={`p-3 rounded-xl text-xs font-bold ${
                        sub.status === "passed"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                          : sub.status === "failed"
                          ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-300"
                      }`}>
                        حالة التسليم: {labels[sub.status] || sub.status}
                      </div>
                    );
                  })()}

                  {/* Submission form */}
                  {(!selectedLesson.progress?.homeworkPassed) && (
                    <form onSubmit={handleHomeworkSubmit} className="space-y-3">
                      <textarea
                        value={homeworkText}
                        onChange={e => setHomeworkText(e.target.value)}
                        placeholder="اكتب إجابة الواجب أو الملاحظات هنا..."
                        className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-900 text-xs text-[var(--ink)] resize-none"
                        style={{ borderColor: "var(--border)" }}
                        rows={3}
                      />
                      <input
                        type="text"
                        value={homeworkUrl}
                        onChange={e => setHomeworkUrl(e.target.value)}
                        placeholder="رابط ملف الواجب (Google Drive / OneDrive إلخ) - اختياري"
                        className="w-full p-2 border rounded-xl bg-white dark:bg-slate-900 text-xs text-[var(--ink)]"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <button
                        type="submit"
                        disabled={submittingHw}
                        className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold rounded-xl text-xs border-none cursor-pointer disabled:opacity-50 transition-colors shadow-md"
                      >
                        {submittingHw ? "جاري تسليم الملف..." : "📤 تسليم الواجب الدراسي"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* 4. AI PROJECT PORTAL */}
              {selectedLesson.hasProject && (
                <div className="border border-purple-100 dark:border-purple-950/30 rounded-2xl p-5 bg-purple-50/30 dark:bg-purple-950/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h4 className="text-sm font-black text-purple-950 dark:text-purple-400">تقييم الكود الذكي (AI Project)</h4>
                      <p className="text-xs text-purple-700/70 dark:text-purple-500/70">سلم مشروعك للحصول على تقييم وتصحيح فوري وتفاعلي بالذكاء الاصطناعي.</p>
                    </div>
                  </div>

                  {/* Submissions list */}
                  {selectedLesson.projectSubmissions.length > 0 && (() => {
                    const sub = selectedLesson.projectSubmissions[0];
                    return (
                      <div className="space-y-3">
                        <div className={`p-3 rounded-xl text-xs font-bold ${
                          sub.status === "graded"
                            ? (sub.grade ?? 0) >= 50
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                              : "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-300"
                        }`}>
                          حالة المشروع: {sub.status === "graded" ? `تم التقييم بنجاح بنسبة (${sub.grade}%)` : "⏳ جاري التقييم بواسطة معلم الذكاء الاصطناعي..."}
                        </div>
                        {sub.feedback && (
                          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl text-xs leading-relaxed border border-purple-100 dark:border-purple-950/20">
                            <p className="font-bold text-[var(--ink)] mb-1">📝 تقييم وملاحظات الذكاء الاصطناعي:</p>
                            <p className="text-[var(--ink-2)] whitespace-pre-wrap">{sub.feedback}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Submission form */}
                  {(!selectedLesson.progress?.projectPassed) && (
                    <form onSubmit={handleProjectSubmit} className="space-y-3">
                      <textarea
                        value={projectText}
                        onChange={e => setProjectText(e.target.value)}
                        placeholder="ضع الكود البرمجي أو حل المشروع هنا..."
                        className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-900 text-xs text-[var(--ink)] font-mono resize-y"
                        style={{ borderColor: "var(--border)" }}
                        rows={4}
                      />
                      <input
                        type="text"
                        value={projectUrl}
                        onChange={e => setProjectUrl(e.target.value)}
                        placeholder="رابط المشروع على GitHub أو Replit (اختياري)"
                        className="w-full p-2 border rounded-xl bg-white dark:bg-slate-900 text-xs text-[var(--ink)]"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <button
                        type="submit"
                        disabled={submittingProject}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-600 hover:from-purple-400 hover:to-fuchsia-500 text-white font-bold rounded-xl text-xs border-none cursor-pointer disabled:opacity-50 transition-colors shadow-md"
                      >
                        {submittingProject ? "جاري تقييم المشروع..." : "🤖 تسليم للمراجعة الذكية"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI STUDY ASSISTANT PANEL */}
      {plan?.chatEnabled && chatOpen && (
        <div className="fixed inset-y-0 left-0 w-80 z-[60] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-left">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-black text-sm text-[var(--ink)]">💬 مساعد الدراسة الذكي</h3>
            <button
              onClick={() => setChatOpen(false)}
              className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-xl font-bold leading-none"
            >
              &times;
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-slate-100 dark:bg-slate-800 text-[var(--ink)] rounded-tl-none"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            {sendingChat && (
              <div className="flex items-center gap-1.5 text-gray-400 text-xs px-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="p-3 border-t flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="اسألني عن الدرس الحالي..."
              className="flex-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-[var(--ink)] outline-none"
              style={{ borderColor: "var(--border)" }}
              required
            />
            <button
              type="submit"
              disabled={sendingChat || !inputMessage.trim()}
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl border-none cursor-pointer disabled:opacity-50 font-bold text-xs"
            >
              إرسال
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
