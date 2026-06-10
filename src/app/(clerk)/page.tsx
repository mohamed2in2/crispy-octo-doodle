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
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
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
          <section className="py-32 relative overflow-hidden bg-[#0B0F19]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="max-w-5xl mx-auto px-4 relative z-10">
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight relative z-10">
                  مستعد لبدء{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">رحلتك البرمجية؟</span>
                </h2>
                <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium relative z-10">
                  انضم إلى آلاف المتعلمين الذين يحققون نتائج استثنائية مع منصتنا التعليمية المتطورة
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                  <Link
                    href="/signup"
                    className="group relative px-8 py-4 bg-white text-[#0B0F19] font-bold rounded-full hover:scale-105 transition-all text-lg inline-flex items-center justify-center overflow-hidden min-w-[200px]"
                  >
                    <span className="relative z-10">إنشاء حساب مجاني</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                  <Link
                    href="/courses"
                    className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-all text-lg inline-flex items-center justify-center min-w-[200px] backdrop-blur-sm"
                  >
                    تصفح الكورسات
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
        {isLoggedIn && (
          <section className="py-20 relative overflow-hidden">
            <div className="max-w-5xl mx-auto px-4 relative z-10">
              <Link
                href="/parent"
                className="group relative block bg-white dark:bg-[#151B2B] rounded-[2rem] border border-gray-100 dark:border-white/5 p-8 md:p-12 overflow-hidden hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/10"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">بوابة ولي الأمر</h3>
                      <p className="text-gray-500 dark:text-gray-400">تابع الأداء الأكاديمي، النقاط، وتقارير الذكاء الاصطناعي للمتعلم.</p>
                    </div>
                  </div>
                  <div className="shrink-0 mt-4 md:mt-0">
                    <span className="inline-flex items-center justify-center px-6 py-3 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white font-bold rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      الدخول للبوابة
                      <svg className="w-5 h-5 mr-2 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
