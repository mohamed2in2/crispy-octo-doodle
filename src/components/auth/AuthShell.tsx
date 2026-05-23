"use client";

import Link from "next/link";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "md" | "2xl";
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = "md",
}: AuthShellProps) {
  const widthClass = maxWidth === "2xl" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10"
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-lg">A</span>
          </div>
          <span className="font-black text-lg text-slate-900 dark:text-white">ALASLY</span>
        </Link>
        <DarkModeToggle />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 pb-10">
        <div className={`w-full ${widthClass}`}>
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base">{subtitle}</p>
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
