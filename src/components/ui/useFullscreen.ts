"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wrapper-based fullscreen. Cross-origin iframes can't host our DOM overlay in
 * their OWN native fullscreen, so we fullscreen a same-origin wrapper (which
 * contains the watermark) instead. Returns a ref to attach to that wrapper.
 */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFs(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch { /* fullscreen denied — ignore */ }
  }, []);

  return { ref, isFs, toggle };
}
