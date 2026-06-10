"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface WatchSessionData {
  sessionId: string;
  sessionToken: string;
  videoId: string;
  video: {
    id: string;
    title: string;
    vdoCipherId: string;
    courseId: string;
    courseTitle: string;
  };
  expiresAt: string;
  isExpired: boolean;
  remainingWatches: number;
  totalWatches: number;
  usedWatches: number;
}

function formatCountdown(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function WatchCountBar({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-500 shadow-inner ${
              i < used ? "bg-red-500 shadow-red-500/50" : "bg-slate-700/50 border border-white/5"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400 font-mono font-bold tracking-wider">{used}/{total}</span>
    </div>
  );
}

export default function VideoWatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = useParams() as Record<string, string>;
  const courseId = params.id;
  const videoId = params.videoId;

  // Token may be passed in URL on refresh so we don't create a duplicate session
  const tokenFromUrl = searchParams.get("token");

  const [session, setSession] = useState<WatchSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState("");
  const [iframeSrc, setIframeSrc] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // If token is in URL, verify existing session first (don't consume another watch)
      if (tokenFromUrl) {
        const verifyRes = await fetch(
          `/api/videos/${videoId}/watch?token=${encodeURIComponent(tokenFromUrl)}`
        );
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok) {
          setError(verifyData.error || "الجلسة غير صالحة — يرجى بدء مشاهدة جديدة");
          setLoading(false);
          return;
        }

        // Session is valid — use it, no new watch consumed
        setSession({
          sessionId: verifyData.sessionId,
          sessionToken: verifyData.sessionToken,
          videoId: verifyData.videoId,
          video: verifyData.video,
          expiresAt: verifyData.expiresAt,
          isExpired: verifyData.isExpired,
          remainingWatches: verifyData.remainingWatches,
          totalWatches: verifyData.totalWatches,
          usedWatches: verifyData.usedWatches,
        });

        // Get secure embed URL (read-only, doesn't consume a watch)
        const secureRes = await fetch(
          `/api/videos/${videoId}/secure-url?token=${encodeURIComponent(tokenFromUrl)}`
        );
        const secureData = await secureRes.json();

        if (!secureRes.ok) {
          setError(secureData.error || "تعذر تحميل الفيديو");
          setLoading(false);
          return;
        }

        setIframeSrc(secureData.embedUrl || "");
        setCountdown(formatCountdown(verifyData.expiresAt));
        setLoading(false);
        return;
      }

      // No token — create a new session (consumes a watch slot)
      // Step 1: fetch full course data to get video title
      const courseRes = await fetch(`/api/courses/${courseId}`);
      const courseData = await courseRes.json();

      if (!courseRes.ok) {
        setError(courseData.error || "تعذر تحميل بيانات الكورس");
        setLoading(false);
        return;
      }

      // Find the video's title from course folders
      let videoTitle = "محاضرة";
      let videoFound = false;

      for (const folder of courseData.course?.folders ?? []) {
        for (const v of folder.videos ?? []) {
          if ((v as { id?: string }).id === videoId) {
            videoTitle = v.title;
            videoFound = true;
            break;
          }
        }
        if (videoFound) break;
      }

      // Step 2: fetch watch count
      const wcRes = await fetch(`/api/courses/${courseId}/watch-count`);
      const wcData = await wcRes.json();

      if (!wcRes.ok || wcData.remainingWatches <= 0) {
        setError(wcData.error || "استنفدت جميع محاولات المشاهدة — تواصل مع المعلم");
        setLoading(false);
        return;
      }

      // Step 3: POST to start a new watch session (consumes 1 watch slot)
      const watchRes = await fetch(`/api/videos/${videoId}/watch`, {
        method: "POST",
        credentials: "include",
      });
      const watchData = await watchRes.json();

      if (!watchRes.ok) {
        setError(watchData.error || "تعذر بدء جلسة المشاهدة");
        setLoading(false);
        return;
      }

      const expiresAt = new Date(watchData.expiresAt);

      setSession({
        sessionId: watchData.sessionId,
        sessionToken: watchData.sessionToken,
        videoId,
        video: {
          id: videoId,
          title: videoTitle,
          vdoCipherId: "",
          courseId,
          courseTitle: courseData.course?.title ?? "",
        },
        expiresAt: expiresAt.toISOString(),
        isExpired: false,
        remainingWatches: watchData.remainingWatches,
        totalWatches: watchData.totalWatches,
        usedWatches: watchData.usedWatches,
      });

      setIframeSrc(watchData.embedUrl || "");
      setCountdown(formatCountdown(expiresAt.toISOString()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تحميل جلسة المشاهدة");
    } finally {
      setLoading(false);
    }
  }, [courseId, videoId, tokenFromUrl]);

  useEffect(() => {
    if (!courseId || !videoId) return;
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [courseId, videoId, loadSession]);

  // Live countdown
  useEffect(() => {
    if (!session) return;
    const tick = () => setCountdown(formatCountdown(session.expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  const handleReturn = () => {
    router.push(`/courses/${courseId}/learn`);
  };

  const buildReturnUrl = () => {
    if (session) {
      return `/courses/${courseId}/learn`;
    }
    return `/courses/${courseId}/learn`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-white font-semibold text-lg">جارٍ تجهيز جلسة المشاهدة...</p>
            <p className="text-white/40 text-sm mt-1">
              {tokenFromUrl ? "جارٍ التحقق من جلستك" : "جارٍ بدء جلستك الجديدة"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            {error?.includes("استنفدت") ? "🚫" : "⚠️"}
          </div>
          <div>
            <h2 className="text-xl font-black text-white mb-2">
              {error?.includes("استنفدت") ? "استنفذت المحاولات" : "لا يمكن تشغيل الفيديو"}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              {error || "حدث خطأ غير متوقع"}
            </p>
          </div>
          <div className="space-y-2">
            <Link
              href={buildReturnUrl()}
              className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-center"
            >
              العودة لصفحة التعلم
            </Link>
            {!error?.includes("استنفدت") && (
              <button
                onClick={loadSession}
                className="w-full py-2.5 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white rounded-xl transition-colors text-sm"
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isSessionExpired = countdown === "00:00:00";

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans selection:bg-sky-500/30">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-950/40 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          {/* Left: breadcrumb */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-sky-400/80 font-semibold mb-1">{session.video.courseTitle}</p>
            <h1 className="text-lg font-black text-white truncate leading-tight tracking-wide">{session.video.title}</h1>
          </div>

          {/* Center: countdown + session status */}
          <div className="flex items-center gap-6 bg-black/40 border border-white/10 rounded-2xl px-6 py-3 shadow-inner">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">المتبقي</p>
              <p className={`text-2xl font-mono font-black tabular-nums tracking-wider ${isSessionExpired ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"}`}>
                {countdown}
              </p>
            </div>
            {!isSessionExpired && (
              <>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">مدة الجلسة</p>
                  <p className="text-sm font-mono text-slate-300 font-bold">4 ساعات</p>
                </div>
              </>
            )}
          </div>

          {/* Right: watch bar + return */}
          <div className="flex items-center gap-6 shrink-0 flex-1 justify-end">
            <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/5 hidden sm:block">
              <WatchCountBar used={session.usedWatches} total={session.totalWatches} />
            </div>
            <button
              onClick={handleReturn}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-sky-400 group-hover:-translate-x-1 transition-transform" style={{ transform: "scaleX(-1)" }}>
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              العودة
            </button>
          </div>
        </div>
      </header>

      {/* Player area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 pt-32 relative z-10">
        <div className="w-full max-w-[1100px] space-y-6">

          {/* Protection notice */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <span className="text-red-400 text-sm">🔒</span>
              </div>
              <span className="text-slate-300 font-medium tracking-wide">رابط الفيديو محمي — لا يمكن نسخه أو مشاركته</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-sky-400 font-medium bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>مشاهدة خاصة بك فقط</span>
            </div>
          </div>

          {/* Player card wrapper for glowing effect */}
          <div className="relative group">
            {/* Animated Glow Behind Player */}
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-500 rounded-[1.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
            
            <div
              className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a0f1e] shadow-2xl"
            >
              {/* Top gradient + overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent z-10 pointer-events-none" />

            {/* Live badge */}
            {!isSessionExpired && (
              <div className="absolute top-4 right-4 z-20">
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-white/80 font-medium">مشاهدة مباشرة</span>
                </div>
              </div>
            )}

            {/* Expired badge */}
            {isSessionExpired && (
              <div className="absolute top-4 right-4 z-20">
                <div className="flex items-center gap-1.5 bg-red-900/80 backdrop-blur-sm border border-red-700/50 rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-red-200 font-medium">انتهت الجلسة</span>
                </div>
              </div>
            )}

            {/* Back button overlay */}
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={handleReturn}
                className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-white text-sm hover:bg-black/90 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" style={{ transform: "scaleX(-1)" }}>
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                العودة للكورس
              </button>
            </div>

            {/* The iframe */}
            <div style={{ paddingTop: "56.25%" }} className="relative bg-slate-900">
              {iframeSrc ? (
                <iframe
                  src={iframeSrc}
                  title={session.video.title}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  style={{ border: "none" }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                  <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">جارٍ تحميل الفيديو...</p>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="bg-slate-950/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-bold tracking-wide">{session.video.title}</p>
                <p className="text-sky-400/80 text-xs mt-1 font-medium">
                  {session.video.courseTitle} • جلستك صالحة لمدة 4 ساعات
                </p>
              </div>
            </div>
          </div>
        </div>

          {/* Footer hints */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 px-2">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>تنتهي الجلسة تلقائياً بعد 4 ساعات</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>رابط الفيديو لا يمكن مشاركته</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>للمساعدة: تواصل مع المعلم</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}