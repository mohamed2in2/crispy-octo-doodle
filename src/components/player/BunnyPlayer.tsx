"use client";

import { useEffect, useState } from "react";

interface BunnyPlayerProps {
  embedUrl?: string;
  fallbackEmbedUrl?: string;
  title?: string;
}

export function BunnyPlayer({ embedUrl, fallbackEmbedUrl, title }: BunnyPlayerProps) {
  const [src, setSrc] = useState(embedUrl || "");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setSrc(embedUrl || "");
    setLoadError(false);
  }, [embedUrl]);

  const activeSrc = src || embedUrl || "";

  if (!activeSrc) {
    return (
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-8 text-center">
        <p className="text-sm text-slate-400">
          لا يمكن تشغيل الفيديو بدون رابط آمن من الخادم. تأكد من تسجيل الدخول وصلاحية الكورس.
        </p>
      </div>
    );
  }

  const tryFallback = () => {
    if (fallbackEmbedUrl && activeSrc !== fallbackEmbedUrl) {
      setSrc(fallbackEmbedUrl);
      setLoadError(false);
      return;
    }
    setLoadError(true);
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.9)]">
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-slate-900 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              ▶
            </span>
            <span className="truncate text-sm font-semibold text-white">{title}</span>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
            محمي
          </span>
        </div>
      )}
      <div className="relative" style={{ paddingTop: "56.25%" }}>
        <iframe
          key={activeSrc}
          src={activeSrc}
          title={title || "Video Player"}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture"
          allowFullScreen
          style={{ border: "none" }}
          onError={tryFallback}
        />
      </div>
      {loadError && (
        <div className="border-t border-amber-500/20 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          تعذر تحميل الفيديو. جرّب مرة أخرى أو تواصل مع الدعم.
          <button type="button" onClick={tryFallback} className="mr-2 underline hover:text-white">
            إعادة المحاولة
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-slate-900 px-4 py-3">
        <span className="text-xs text-slate-400">تشغيل آمن عبر الخادم</span>
        <span className="text-xs text-slate-500">🔒 محمي</span>
      </div>
    </div>
  );
}
