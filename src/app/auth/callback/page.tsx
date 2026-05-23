"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { fetchMeWithRetry } from "@/lib/fetch-me";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [message, setMessage] = useState("جاري تجهيز حسابك...");

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const resolveDestination = async () => {
      const user = await fetchMeWithRetry(12, 300);

      if (cancelled) {
        return;
      }

      if (!user) {
        setMessage("تعذر مزامنة الحساب. جاري إعادة المحاولة...");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        router.refresh();
        const retryUser = await fetchMeWithRetry(8, 400);
        if (cancelled) {
          return;
        }
        if (!retryUser) {
          router.replace("/complete-profile");
          return;
        }
        router.replace(retryUser.profileCompleted ? "/" : "/complete-profile");
        return;
      }

      router.replace(user.profileCompleted ? "/" : "/complete-profile");
    };

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  return (
    <AuthShell title="مرحباً بك" subtitle="نقوم بإعداد حسابك للمنصة">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl p-10 text-center">
        <div className="w-14 h-14 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">{message}</p>
      </div>
    </AuthShell>
  );
}
