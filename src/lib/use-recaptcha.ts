"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

export function useRecaptcha() {
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !SITE_KEY) return;
    loaded.current = true;
    const markReady = () => window.grecaptcha?.enterprise?.ready(() => setReady(true));
    const existing = document.querySelector<HTMLScriptElement>('script[src*="recaptcha/enterprise"]');
    if (existing) {
      if (window.grecaptcha?.enterprise) markReady();
      else existing.addEventListener("load", markReady, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = ["https:/", "/www.google.com/recaptcha/enterprise.js?render=", encodeURIComponent(SITE_KEY)].join("");
    script.async = true;
    script.defer = true;
    script.addEventListener("load", markReady, { once: true });
    document.head.appendChild(script);
  }, []);

  const execute = useCallback(async (action: string): Promise<string> => {
    if (!SITE_KEY || !ready || !window.grecaptcha?.enterprise) return "";
    try {
      return await window.grecaptcha.enterprise.execute(SITE_KEY, { action });
    } catch (error: unknown) {
      console.error("reCAPTCHA execution failed", { message: error instanceof Error ? error.message : "Unknown error" });
      return "";
    }
  }, [ready]);

  return { execute, ready };
}
