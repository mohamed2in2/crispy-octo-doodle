"use client";

import { useEffect, useState } from "react";

/**
 * Anti-screen-recording forensic watermark.
 *
 * Every 10 seconds the viewer's identifier flashes at a new random position.
 * pointer-events:none so it never blocks player controls.
 */

const VISIBLE_MS = 10_000;
const CYCLE_MS = 10_000;
const OPACITY = 0.22;

function randomPos() {
  return { top: `${8 + Math.random() * 74}%`, left: `${6 + Math.random() * 68}%` };
}

interface Props {
  label: string;
  /** Optional callback fired whenever the watermark flashes (for player disruption). */
  onFlash?: () => void;
}

export function VideoWatermark({ label, onFlash }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState(randomPos);
  const [motionOk, setMotionOk] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => {
      setMotionOk(!event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const flash = () => {
      setPos(randomPos());
      setVisible(true);
      onFlash?.();
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };

    flash();
    const cycle = setInterval(flash, CYCLE_MS);
    return () => {
      clearInterval(cycle);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [onFlash]);

  if (!label) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10" aria-hidden>
      <span
        className="absolute whitespace-nowrap font-mono text-[11px] font-semibold tracking-wider sm:text-sm"
        dir="ltr"
        style={{
          top: pos.top,
          left: pos.left,
          color: `rgba(255,255,255,${OPACITY})`,
          textShadow: "0 1px 4px rgba(0,0,0,0.75)",
          opacity: visible ? 1 : 0,
          transition: motionOk ? "opacity 0.4s ease-in-out" : "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}
