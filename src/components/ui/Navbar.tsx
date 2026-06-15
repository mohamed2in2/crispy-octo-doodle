"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { Trophy } from "lucide-react";

interface NavbarProps {
  user?: { name: string; role: string } | null;
}

const NAV_LINKS = [
  { href: "/",           label: "الرئيسية" },
  { href: "/courses",    label: "الكورسات" },
  { href: "/library",    label: "مكتبتي" },
  { href: "/environments", label: "البيئات" },
  { href: "/account",    label: "حسابي" },
];

export function Navbar({ user }: NavbarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav
      className={`sticky top-0 z-[var(--z-sticky)] transition-all duration-200 ${
        scrolled
          ? "border-b border-[var(--border)] bg-[var(--surface)]/80 dark:bg-[#0b0f19]/85 backdrop-blur-xl shadow-[0_10px_30px_-20px_rgba(15,23,42,0.35)]"
          : "border-b border-transparent bg-[var(--surface)]/60 dark:bg-transparent backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Code-UP — الرئيسية">
              <img
                src="/logo.jpeg"
                alt=""
                aria-hidden="true"
                className="w-8 h-8 rounded-lg object-cover shadow-sm"
              />
              <div className="hidden sm:block leading-tight">
                <span className="block font-black text-lg text-[var(--ink)] tracking-tight">Code-UP</span>
                <span className="block text-[10px] font-medium text-[var(--ink-muted)] leading-none">منصة كورسات متميزة</span>
              </div>
            </Link>

            <Link
              href="/leaderboard"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              aria-label="لوحة الشرف"
              title="لوحة الشرف"
            >
              <Trophy className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-0.5" role="navigation" aria-label="التنقل الرئيسي">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <StreakFlame role={user?.role} />
            <DarkModeToggle />

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--ink-muted)] max-w-[120px] truncate">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-100 dark:border-rose-500/15 transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                >
                  دخول
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-1.5 text-sm font-bold rounded-lg bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] hover:bg-[#1e293b] dark:hover:bg-slate-100 transition-colors shadow-sm"
                >
                  إنشاء حساب
                </Link>
              </div>
            )}

            {/* Hamburger — mobile */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            id="mobile-nav"
            role="navigation"
            aria-label="قائمة التنقل"
            className="md:hidden py-3 border-t border-[var(--border)] space-y-0.5 pb-4"
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="pt-3 px-4 border-t border-[var(--border)] mt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <span className="text-sm font-medium text-[var(--ink-muted)]">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--border)] hover:border-[var(--ink-muted)] transition-colors"
                  >
                    دخول
                  </Link>
                  <Link
                    href="/signup"
                    className="w-full text-center px-4 py-2.5 text-sm font-bold rounded-lg bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] hover:bg-[#1e293b] dark:hover:bg-slate-100 transition-colors"
                  >
                    إنشاء حساب
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
