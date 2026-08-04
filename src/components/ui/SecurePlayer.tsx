"use client";
import React from "react";
import { useState, useCallback } from "react";


import { VideoWatermark } from "./VideoWatermark";
import { YouTubeSecurePlayer } from "./YouTubeSecurePlayer";
import { useFullscreen } from "./useFullscreen";

/**
 * Minimal structural types for the VdoCipher player SDK, which is injected at
 * runtime from player.vdocipher.com and ships no type declarations. Only the
 * members this component actually touches are declared.
 *
 * `seek`, `play` and `pause` are optional on the player itself because older
 * SDK builds expose them only on the underlying media element — which is
 * exactly what the `typeof player.seek === "function"` guard below is for. That
 * guard was previously meaningless, because `any` made both branches type-check
 * regardless of whether the method existed.
 */
type VdoVideoElement = {
  currentTime: number;
  play: () => void;
  pause: () => void;
  addEventListener: (type: string, listener: () => void) => void;
};

type VdoPlayerInstance = {
  video: VdoVideoElement;
  seek?: (seconds: number) => void;
  play?: () => void;
  pause?: () => void;
};

type VdoPlayerConstructor = new (options: {
  iframe: HTMLIFrameElement;
}) => VdoPlayerInstance;

/**
 * Watermark-safe player. The iframe is a cross-origin embed (Bunny/VdoCipher) —
 * a DOM overlay can't be injected into the iframe's OWN native fullscreen, so a
 * sibling watermark vanishes when it goes fullscreen. Fix: the iframe carries no
 * fullscreen permission (its internal FS button is inert) and our own button
 * fullscreens THIS WRAPPER, which contains the watermark.
 *
 * For YouTube we delegate to YouTubeSecurePlayer — native controls off + a full
 * click-shield so the brand/title/link is never clickable.
 *
 * HOOK ORDER: every hook below runs before the YouTube early return. Hooks must
 * not be called conditionally — see the commit message for the crash this fixes.
 */
export function SecurePlayer({
  embedUrl,
  title,
  watermark,
  provider,
  onEnded,
  startSeconds = 0,
  onProgress,
  onPause,
  onPlay,
  className = "",
  paused = false,
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
  /** Fired when playback pauses. */
  onPause?: () => void;
  /** Fired when playback resumes. */
  onPlay?: () => void;
  className?: string;
  paused?: boolean;
}) {
  const { ref: wrapRef, isFs, cssFs, toggle: toggleFs } = useFullscreen<HTMLDivElement>();

  // ── Disruption overlay: fires when watermark flashes ─────────────────────
  const [disrupted, setDisrupted] = useState(false);
  const handleFlash = useCallback(() => {
    setDisrupted(true);
    setTimeout(() => setDisrupted(false), 500);
  }, []);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const vdoPlayerRef = React.useRef<VdoPlayerInstance | null>(null);

  // Resume playback for Bunny & VdoCipher. Both branches are guarded on
  // provider, so this is inert for YouTube.
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
          if (data?.event === "pause") {
            onPause?.();
          }
          if (data?.event === "play" || data?.event === "playing") {
            onPlay?.();
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

      script.onload = () => {
        const VdoPlayer = (window as unknown as { VdoPlayer?: VdoPlayerConstructor })
          .VdoPlayer;
        if (iframeRef.current && VdoPlayer) {
          const player = new VdoPlayer({ iframe: iframeRef.current });
          vdoPlayerRef.current = player;

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

          player.video.addEventListener("pause", () => {
            onPause?.();
          });

          player.video.addEventListener("play", () => {
            onPlay?.();
          });
        }
      };

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        vdoPlayerRef.current = null;
      };
    }
  }, [provider, startSeconds, onProgress, onPause, onPlay]);

  // Handle paused prop changes for Bunny & VdoCipher
  React.useEffect(() => {
    if (provider === "bunny" && iframeRef.current) {
      const method = paused ? "pause" : "play";
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method }),
        "*"
      );
      return;
    }

    if (provider === "vdocipher") {
      const player = vdoPlayerRef.current;
      if (!player) return;
      try {
        if (paused) {
          if (typeof player.pause === "function") {
            player.pause();
          } else {
            player.video.pause();
          }
        } else {
          if (typeof player.play === "function") {
            player.play();
          } else {
            player.video.play();
          }
        }
      } catch (e) {
        console.error("Failed to play/pause VdoCipher player:", e);
      }
    }
  }, [paused, provider]);

  // YouTube → hardened API player (no clickable YouTube chrome).
  // Every hook above has already run, so leaving here is safe.
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
          onPause={onPause}
          onPlay={onPlay}
          paused={paused}
        />
      );
  }

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

      <VideoWatermark label={watermark} onFlash={handleFlash} />

      {/* Anti-screen-recording disruption overlay — 500ms opacity drop on every watermark flash */}
      {disrupted && (
        <div
          className="absolute inset-0 z-[15] pointer-events-none"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "brightness(0.4)" }}
          aria-hidden
        />
      )}

      {/* Our fullscreen control sits at the bottom-RIGHT, directly over the
          VdoCipher/Bunny iframe's own (inert — no allowfullscreen) fullscreen
          button. Being a higher-stacked sibling (z-20) it captures the click
          there, so the spot users instinctively tap triggers OUR wrapper
          fullscreen — which keeps the watermark on screen. */}
      <button
        type="button"
        onClick={toggleFs}
        aria-label={isFs ? "\u0625\u0646\u0647\u0627\u0621 \u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629" : "\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629"}
        className="absolute bottom-2.5 right-2.5 z-20 w-10 h-10 rounded-lg bg-black/55 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
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
