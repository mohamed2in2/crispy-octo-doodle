"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";

const AUTH_CALLBACK = "/auth/callback";

export default function LoginPage() {
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
