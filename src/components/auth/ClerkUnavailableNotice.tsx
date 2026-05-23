"use client";

import Link from "next/link";

interface ClerkUnavailableNoticeProps {
  title: string;
  message: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function ClerkUnavailableNotice({
  title,
  message,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: ClerkUnavailableNoticeProps) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl p-6 sm:p-8 text-center space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-7">{message}</p>
      </div>

      {(primaryLabel || secondaryLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {primaryLabel && primaryHref && (
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors"
            >
              {primaryLabel}
            </Link>
          )}
          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}