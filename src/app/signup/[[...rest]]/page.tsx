"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";
import { useClerkRuntime } from "@/components/auth/ClerkRuntimeProvider";
import { ClerkUnavailableNotice } from "@/components/auth/ClerkUnavailableNotice";

const AUTH_CALLBACK = "/auth/callback";

export default function SignupPage() {
  const { enabled: clerkEnabled } = useClerkRuntime();

  if (!clerkEnabled) {
    return (
      <AuthShell title="إنشاء حساب جديد" subtitle="إنشاء الحساب متاح فقط على النطاقات المفعلة لـ Clerk">
        <ClerkUnavailableNotice
          title="المصادقة غير متاحة في هذا المعاينة"
          message="هذا النطاق يعمل بدون Clerk حتى لا يظهر خطأ المفتاح الإنتاجي. افتح التطبيق على alasly.live أو أضف مفتاح Clerk تجريبي لتفعيل إنشاء الحساب هنا."
          primaryLabel="العودة إلى الصفحة الرئيسية"
          primaryHref="/"
          secondaryLabel="تسجيل الدخول"
          secondaryHref="/login"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="إنشاء حساب جديد"
      subtitle="انضم إلى منصة ALASLY وابدأ رحلتك التعليمية"
      footer={
        <>
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-sky-600 dark:text-sky-400 font-semibold hover:underline">
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <SignUp
        routing="path"
        path="/signup"
        appearance={clerkAuthAppearance}
        forceRedirectUrl={AUTH_CALLBACK}
        fallbackRedirectUrl={AUTH_CALLBACK}
        signInUrl="/login"
      />
    </AuthShell>
  );
}
