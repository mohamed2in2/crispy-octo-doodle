"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { Trophy } from "lucide-react";

interface NavbarProps {
  user?: { name: string; role: string } | null;
}

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الكورسات" },
  { href: "/library", label: "مكتبتي" },
  { href: "/environments", label: "البيئات" },
  { href: "/account", label: "حسابي" },
];

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/40 dark:border-white/5 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="شعار منصة Code-UP" className="w-9 h-9 rounded-xl object-cover shadow-lg" />
              <div className="hidden sm:block">
                <span className="font-black text-xl text-slate-900 dark:text-white">Code-UP</span>
                <div className="text-xs text-slate-500 dark:text-slate-300">
                  <span className="block">منصة كورسات متميزة</span>
                </div>
              </div>
            </Link>

            <Link 
              href="/leaderboard" 
              className="p-2 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors border border-yellow-200 dark:border-yellow-500/30 shadow-sm"
              title="لوحة الشرف"
            >
              <Trophy className="w-5 h-5" />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <DarkModeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  دخول
                </Link>
                <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors">
                  تسجيل
                </Link>
              </div>
            )}

            <button
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
