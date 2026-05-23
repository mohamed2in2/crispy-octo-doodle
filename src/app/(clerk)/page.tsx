"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { StatsSection } from "@/components/home/StatsSection";
import { useClerkRuntime } from "@/components/auth/ClerkRuntimeProvider";

export default function HomePage() {
  const { enabled: clerkEnabled } = useClerkRuntime();

  if (!clerkEnabled) {
    return <HomePageShell isLoggedIn={false} />;
  }

  return <ClerkHomePage />;
}

function ClerkHomePage() {
  const { isLoaded, isSignedIn } = useUser();
  const isLoggedIn = isLoaded ? isSignedIn : false;

  return <HomePageShell isLoggedIn={isLoggedIn} />;
}

function HomePageShell({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
      <Navbar user={null} />
      <main className="flex-1">
        <HeroSection isLoggedIn={isLoggedIn} />
        <FeaturesSection />
        <StatsSection />
        {!isLoggedIn && (
          <section className="py-20 bg-blue-600">
            <div className="max-w-4xl mx-auto text-center px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                ابدأ رحلتك التعليمية اليوم
              </h2>
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
