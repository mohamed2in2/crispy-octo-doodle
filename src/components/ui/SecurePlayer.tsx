"use client";
import React from "react";

import { VideoWatermark } from "./VideoWatermark";
import { YouTubeSecurePlayer } from "./YouTubeSecurePlayer";
import { useFullscreen } from "./useFullscreen";

/**
 * Watermark-safe player. The iframe is a cross-origin embed (Bunny/VdoCipher) —
 * a DOM overlay can't be injected into the iframe's OWN native fullscreen, so a
 * sibling watermark vanishes when it goes fullscreen. Fix: the iframe carries no
 * fullscreen permission (its internal FS button is inert) and our own button
 * fullscreens THIS WRAPPER, which contains the watermark.
 *
 * For YouTube we delegate to YouTubeSecurePlayer — native controls off + a full
 * click-shield so the brand/title/link is never clickable.
 */
export function SecurePlayer({
  embedUrl,
  title,
  watermark,
  provider,
  onEnded,
  startSeconds = 0,
  onProgress,
  className = "",
}: {
  embedUrl: string;
  title: string;
  watermark: string;
  provider?: string;
  onEnded?: () => void;
  /** Resume position in seconds. Currently honored on YouTube (the only provider
   *  whose cross-origin embed exposes seek/currentTime safely; signed
   *  Bunny/VdoCipher URLs must not be mutated with extra params). */
  startSeconds?: number;
  /** Reports current position (throttled) for saving. YouTube only — see above. */
  onProgress?: (seconds: number) => void;
  className?: string;
}) {
  const { ref: wrapRef, isFs, cssFs, toggle: toggleFs } = useFullscreen<HTMLDivElement>();

  // YouTube → hardened API player (no clickable YouTube chrome).
  if (provider === "youtube") {
    const id = embedUrl.match(/\/embed\/([^?/]+)/)?.[1] ?? "";
    if (id)
      return (
        <YouTubeSecurePlayer
          videoId={id}
          title={title}
          watermark={watermark}
          onEnded={onEnded}
          startSeconds={startSeconds}
          onProgress={onProgress}
        />
      );
  }

  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Resume playback for Bunny & VdoCipher
  React.useEffect(() => {
    if (provider === "bunny") {
      const handleMessage = (e: MessageEvent) => {
        try {
          const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
          if (data?.event === "ready" && startSeconds > 0) {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ method: "seek", value: startSeconds }),
              "*"
            );
          }
          if (data?.event === "timeupdate" && typeof data.time === "number") {
            onProgress?.(data.time);
          }
        } catch {
          // ignore parse errors
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }

    if (provider === "vdocipher") {
      const script = document.createElement("script");
      script.src = "https://player.vdocipher.com/v2/api.js";
      script.async = true;
      document.body.appendChild(script);

      let player: any = null;

      script.onload = () => {
        if (iframeRef.current && (window as any).VdoPlayer) {
          player = new (window as any).VdoPlayer({ iframe: iframeRef.current });
          
          player.video.addEventListener("loadedmetadata", () => {
            if (startSeconds > 0) {
               // The API wrapper or standard HTMLMediaElement behavior
               if (typeof player.seek === "function") {
                 player.seek(startSeconds);
               } else {
                 player.video.currentTime = startSeconds;
               }
            }
          });

          player.video.addEventListener("timeupdate", () => {
            if (player.video.currentTime) {
              onProgress?.(player.video.currentTime);
            }
          });
        }
      };

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [provider, startSeconds, onProgress]);

  return (
    <div
      ref={wrapRef}
      className={`relative bg-black w-full select-none ${className}`}
      style={
        cssFs
          ? { position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex: 2147483647 }
          : isFs
          ? { height: "100%" }
          : { paddingTop: "56.25%" }
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin"
        style={{ border: "none" }}
        draggable={false}
      />

      <VideoWatermark label={watermark} />

      <button
        type="button"
        onClick={toggleFs}
        aria-label={isFs ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
        className="absolute bottom-3 left-3 z-20 w-9 h-9 rounded-lg bg-black/55 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
      >
        {isFs ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
          </svg>
        )}
      </button>
    </div>
  );
}
