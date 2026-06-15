"use client";

import { useEffect, useState } from "react";

/**
 * Forensic anti-leak overlay. Renders the viewer's own identifier (phone or
 * name) over the player. To stay unobtrusive for paying students it is hidden
 * most of the time and only flashes in for ~10s once a minute, each time in a
 * new random position — long/often enough to land on a leaked recording, faint
 * enough not to annoy. pointer-events:none so it never blocks player controls.
 */

const VISIBLE_MS = 10_000; // shown for 10s …
const CYCLE_MS = 60_000; // … once every minute
const OPACITY = 0.16; // faint

// Keep the label fully on-screen (it's right-anchored text, dir=ltr).
function randomPos() {
  return { top: `${8 + Math.random() * 74}%`, left: `${6 + Math.random() * 68}%` };
}

export function VideoWatermark({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState(randomPos);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    let hideTimer: ReturnType<typeof setTimeout>;
    const flash = () => {
      setPos(randomPos());
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };

    flash(); // first appearance shortly after load
    const cycle = setInterval(flash, CYCLE_MS);
    return () => {
      clearInterval(cycle);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!label) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10" aria-hidden>
      <span
        className="absolute font-mono text-[11px] sm:text-sm font-semibold tracking-wider whitespace-nowrap"
        dir="ltr"
        style={{
          top: pos.top,
          left: pos.left,
          color: `rgba(255,255,255,${OPACITY})`,
          textShadow: "0 1px 4px rgba(0,0,0,0.75)",
          opacity: visible ? 1 : 0,
          transition: motionOk ? "opacity 0.8s ease-in-out" : "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}
