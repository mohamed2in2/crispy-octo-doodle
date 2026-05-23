"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";

interface NavbarProps {
  user?: { name: string; role: string; clerkId?: string | null } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn, user: clerkUser } = useUser();

  const clerkSignedIn = isSignedIn || Boolean(user?.clerkId);
  const displayName = user?.name || clerkUser?.fullName || clerkUser?.firstName || clerkUser?.primaryEmailAddress?.emailAddress || "المستخدم";

  const links = [
    { href: "/", label: "الرئيسية" },
    { href: "/courses", label: "الكورسات" },
    { href: "/library", label: "مكتبتي" },
    { href: "/account", label: "حسابي" },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/40 dark:border-white/5 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl shadow-[0_10px_30px_-20px_rgba(15,23,42,0.45)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 dark:from-amber-400 dark:via-yellow-400 dark:to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-white dark:text-slate-950 font-black text-lg">A</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-xl text-slate-900 dark:text-white">ALASLY</span>
              <div className="text-xs text-slate-500 dark:text-slate-300">
                <span className="block">منصة تعليمية متميزة</span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
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

          {/* Right side */}
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            {clerkSignedIn ? (
                <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  {displayName}
                </span>
                <UserButton {...({ afterSignOutUrl: "/login" } as any)} />
              </div>
            ) : user ? (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
              >
                خروج
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <span className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
                    دخول
                  </span>
                </SignInButton>
                <SignUpButton mode="modal">
                  <span className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 transition-colors cursor-pointer">
                    تسجيل
                  </span>
                </SignUpButton>
              </div>
            )}

            {/* Mobile menu button */}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
            {links.map((link) => (
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
