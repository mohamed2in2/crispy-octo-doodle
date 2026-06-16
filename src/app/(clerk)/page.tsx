"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { ContactSection } from "@/components/home/ContactSection";
import type { MeUser } from "@/lib/fetch-me";

export default function HomePage() {
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const data = (await response.json()) as { user: MeUser | null };
        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLoggedIn = Boolean(user);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)]">
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "منصة Code-UP الكورسات",
            "alternateName": "Code-UP",
            "url": "https://code-up.tech",
            "logo": "https://code-up.tech/logo.jpeg",
            "description": "منصة كورسات متكاملة للمتعلمين المصريين لمختلف الأعمار والمستويات. محاضرات فيديو، اختبارات تفاعلية، ومتابعة ذكية للتقدم التدريبي.",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+20-128-535-3604",
              "contactType": "customer service",
              "areaServed": "EG",
              "availableLanguage": "Arabic"
            },
            "sameAs": [
              "https://code-up.tech"
            ]
          })
        }}
      />
      <Navbar user={user ? { name: user.name, role: user.role } : null} />
      <main className="flex-1">
        <HeroSection isLoggedIn={isLoggedIn} />
        <FeaturesSection />
        <ContactSection />
        {!isLoggedIn && (
          <section className="py-28 bg-slate-50 dark:bg-[#0b0f19] border-t border-slate-200/60 dark:border-white/5">
            <div className="max-w-3xl mx-auto px-4 text-center">
              <h2 className="text-balance text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                مستعد لبدء رحلتك الدراسية؟
              </h2>
              <p className="text-slate-500 dark:text-white/45 text-base md:text-lg mb-10 max-w-xl mx-auto font-medium">
                انضم إلى آلاف المتعلمين الذين يحققون نتائج استثنائية مع منصتنا
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/signup"
                  className="group relative px-8 py-3.5 bg-indigo-600 text-white dark:bg-white dark:text-[#0b0f19] font-bold rounded-full hover:shadow-[0_0_32px_rgba(99,102,241,0.25)] dark:hover:shadow-[0_0_32px_rgba(255,255,255,0.2)] transition-shadow text-base inline-flex items-center justify-center overflow-hidden min-w-[180px]"
                >
                  <span className="relative z-10">إنشاء حساب مجاني</span>
                  <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-y-0 left-[-45%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 dark:via-indigo-200/40 to-transparent blur-sm transition-[left] duration-700 ease-out group-hover:left-[115%]" />
                  </span>
                </Link>
                <Link
                  href="/courses"
                  className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-white/80 font-bold rounded-full hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-white/8 dark:hover:text-white transition-all text-base inline-flex items-center justify-center min-w-[180px] shadow-sm dark:shadow-none"
                >
                  تصفح الكورسات
                </Link>
              </div>
            </div>
          </section>
        )}

        {isLoggedIn && (
          <section className="py-16 bg-slate-50 dark:bg-[#0b0f19] border-t border-slate-200/60 dark:border-white/5">
            <div className="max-w-4xl mx-auto px-4">
              <Link
                href="/parent"
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/8 dark:bg-white/3 dark:hover:border-sky-400/25 dark:hover:bg-sky-400/4 px-7 py-6 shadow-sm dark:shadow-none transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/50 dark:bg-white/5 dark:border-white/8 flex items-center justify-center text-indigo-500 dark:text-sky-400 shrink-0 group-hover:border-indigo-300 dark:group-hover:border-sky-400/30 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-0.5">بوابة ولي الأمر</h3>
                    <p className="text-sm text-slate-500 dark:text-white/45">تابع الأداء الأكاديمي، النقاط، وتقارير الذكاء الاصطناعي للمتعلم.</p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 group-hover:text-indigo-500 dark:text-white/50 dark:group-hover:text-sky-400 transition-colors">
                  الدخول للبوابة
                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
