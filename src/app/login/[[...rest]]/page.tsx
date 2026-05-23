"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";
import { useClerkRuntime } from "@/components/auth/ClerkRuntimeProvider";
import { ClerkUnavailableNotice } from "@/components/auth/ClerkUnavailableNotice";

const AUTH_CALLBACK = "/auth/callback";

export default function LoginPage() {
  const { enabled: clerkEnabled } = useClerkRuntime();

  if (!clerkEnabled) {
    return (
      <AuthShell title="تسجيل الدخول" subtitle="تسجيل الدخول متاح فقط على النطاقات المفعلة لـ Clerk">
        <ClerkUnavailableNotice
          title="المصادقة غير متاحة في هذا المعاينة"
          message="هذا النطاق يعمل بدون Clerk حتى لا يظهر خطأ المفتاح الإنتاجي. افتح التطبيق على alasly.live أو أضف مفتاح Clerk تجريبي لتفعيل تسجيل الدخول هنا."
          primaryLabel="العودة إلى الصفحة الرئيسية"
          primaryHref="/"
          secondaryLabel="إنشاء حساب"
          secondaryHref="/signup"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="أهلاً بعودتك إلى منصة ALASLY"
      footer={
        <>
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
            إنشاء حساب مجاني
          </Link>
        </>
      }
    >
      <SignIn
        routing="path"
        path="/login"
        appearance={clerkAuthAppearance}
        forceRedirectUrl={AUTH_CALLBACK}
        fallbackRedirectUrl={AUTH_CALLBACK}
        signUpUrl="/signup"
      />
    </AuthShell>
  );
}
