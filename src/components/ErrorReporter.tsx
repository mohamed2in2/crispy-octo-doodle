"use client";
import { useEffect } from "react";

const ENDPOINT = "/api/errors/report";

/** Noise patterns we intentionally ignore */
const IGNORE_PATTERNS = [
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /safari-extension:\/\//i,
  /Script error/i,
  /ResizeObserver loop/i,
];

function shouldIgnore(message: string): boolean {
  return IGNORE_PATTERNS.some((p) => p.test(message));
}

async function report(
  type: "error" | "warning" | "unhandled_promise" | "api_error",
  message: string,
  stack?: string
) {
  if (shouldIgnore(message)) return;
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message: message.slice(0, 1000),
        stack: stack?.slice(0, 4000),
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    });
  } catch {
    // reporting must never throw
  }
}

export function ErrorReporter() {
  useEffect(() => {
    // ── window.onerror ──────────────────────────────────────────────────────
    const prevOnError = window.onerror;
    window.onerror = (message, source, _line, _col, error) => {
      void report("error", String(message), error?.stack ?? `@ ${source}`);
      return prevOnError ? prevOnError(message, source, _line, _col, error) : false;
    };

    // ── unhandledrejection ───────────────────────────────────────────────────
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg =
        e.reason instanceof Error
          ? e.reason.message
          : String(e.reason ?? "Unhandled promise rejection");
      void report("unhandled_promise", msg, (e.reason as Error)?.stack);
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    // ── console.error / console.warn override ───────────────────────────────
    const origError = console.error.bind(console);
    const origWarn = console.warn.bind(console);

    console.error = (...args: unknown[]) => {
      origError(...args);
      const message = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
      const stack = args.find((a) => a instanceof Error)?.stack as string | undefined;
      void report("error", message, stack);
    };

    console.warn = (...args: unknown[]) => {
      origWarn(...args);
      const message = args.map((a) => String(a)).join(" ");
      void report("warning", message);
    };

    return () => {
      window.onerror = prevOnError;
      window.removeEventListener("unhandledrejection", onUnhandled);
      console.error = origError;
      console.warn = origWarn;
    };
  }, []);

  return null;
}
