"use client";

import { useEffect, useRef, useState } from "react";

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

export type WatermarkHandle = {
  onDisrupt: (fn: () => void) => void;
};

interface Props {
  label: string;
  onFlash?: () => void;
}

export function VideoWatermark({ label, onFlash }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState(randomPos);
  const onFlashRef = useRef(onFlash);

  useEffect(() => {
    onFlashRef.current = onFlash;
  }, [onFlash]);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const flash = () => {
      setPos(randomPos());
      setVisible(true);
      onFlashRef.current?.();
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };

    flash();
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
        className="absolute font-mono text-[11px] sm:text-sm font-semibold tracking-wider whitespace-nowrap transition-opacity duration-300 motion-reduce:transition-none"
        dir="ltr"
        style={{
          top: pos.top,
          left: pos.left,
          color: `rgba(255,255,255,${OPACITY})`,
          textShadow: "0 1px 4px rgba(0,0,0,0.75)",
          opacity: visible ? 1 : 0,
        }}
      >
        {label}
      </span>
    </div>
  );
}
