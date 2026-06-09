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
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "منصة Code-UP التعليمية",
            "alternateName": "Code-UP",
            "url": "https://code-up.tech",
            "logo": "https://code-up.tech/logo.jpeg",
            "description": "منصة تعليمية متكاملة للطلاب المصريين من الصف السادس حتى الثالث الثانوي. محاضرات فيديو، اختبارات تفاعلية، ومتابعة ذكية للتقدم الدراسي.",
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
          <section className="py-20 bg-blue-600">
            <div className="max-w-4xl mx-auto text-center px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">ابدأ رحلتك التعليمية اليوم</h2>
              <p className="text-blue-100 text-lg mb-8">
                انضم إلى آلاف الطلاب المصريين الذين يحققون نتائج رائعة مع منصتنا
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors text-lg"
                >
                  إنشاء حساب مجاني
                </Link>
                <Link
                  href="/courses"
                  className="px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-colors text-lg"
                >
                  تصفح الكورسات
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
