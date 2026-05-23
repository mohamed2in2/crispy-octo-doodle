"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

const AUTH_CALLBACK = "/auth/callback";

export default function SignupPage() {
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
