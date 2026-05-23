"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { EDUCATIONAL_STAGES } from "@/types";
import { fetchMeWithRetry } from "@/lib/fetch-me";
import { useClerkRuntime } from "@/components/auth/ClerkRuntimeProvider";
import { ClerkUnavailableNotice } from "@/components/auth/ClerkUnavailableNotice";

function clerkDisplayName(clerkUser: ReturnType<typeof useUser>["user"]) {
  if (!clerkUser) return "";
  if (clerkUser.fullName) return clerkUser.fullName;
  const parts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] || "";
}

export default function CompleteProfilePage() {
  const { enabled: clerkEnabled } = useClerkRuntime();

  if (!clerkEnabled) {
    return (
      <AuthShell title="إكمال البيانات الشخصية" subtitle="إكمال الملف الشخصي يتطلب Clerk على النطاق الإنتاجي" maxWidth="2xl">
        <ClerkUnavailableNotice
          title="المصادقة غير متاحة في هذا المعاينة"
          message="هذا النطاق يعمل بدون Clerk حتى لا يظهر خطأ المفتاح الإنتاجي. افتح التطبيق على alasly.live أو أضف مفتاح Clerk تجريبي لتفعيل صفحة الملف الشخصي."
          primaryLabel="العودة إلى الصفحة الرئيسية"
          primaryHref="/"
        />
      </AuthShell>
    );
  }

  return <ClerkCompleteProfilePage />;
}

function ClerkCompleteProfilePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    parentPhone: "",
    age: "",
    educationalStage: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      const user = await fetchMeWithRetry(15, 400);

      if (cancelled) {
        return;
      }

      if (user?.profileCompleted) {
        router.replace("/");
        return;
      }

      if (user) {
        setForm({
          name: user.name || "",
          phone: user.phone || "",
          parentPhone: user.parentPhone || "",
          age: user.age ? String(user.age) : "",
          educationalStage: user.educationalStage || "",
        });
        setSyncFailed(false);
        setInitialLoading(false);
        return;
      }

      const fallbackName = clerkDisplayName(clerkUser);
      if (fallbackName) {
        setForm((prev) => ({ ...prev, name: prev.name || fallbackName }));
        setSyncFailed(false);
        setInitialLoading(false);
        return;
      }

      setSyncFailed(true);
      setInitialLoading(false);
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router, clerkUser]);

  const handleRetrySync = () => {
    setSyncFailed(false);
    setInitialLoading(true);
    setError("");
    void fetchMeWithRetry(15, 400).then((user) => {
      if (user?.profileCompleted) {
        router.replace("/");
        return;
      }
      if (user) {
        setForm({
          name: user.name || "",
          phone: user.phone || "",
          parentPhone: user.parentPhone || "",
          age: user.age ? String(user.age) : "",
          educationalStage: user.educationalStage || "",
        });
        setSyncFailed(false);
        setInitialLoading(false);
        return;
      }
      const fallbackName = clerkDisplayName(clerkUser);
      if (fallbackName) {
        setForm((prev) => ({ ...prev, name: prev.name || fallbackName }));
        setSyncFailed(false);
        setInitialLoading(false);
        return;
      }
      setSyncFailed(true);
      setInitialLoading(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.phone.trim() === form.parentPhone.trim()) {
      setError("رقم الطالب لا يمكن أن يكون نفس رقم الوالد/الوالدة");
      setLoading(false);
      return;
    }

    try {
      const submitProfile = async (retryCount = 0): Promise<Response> => {
        const response = await fetch("/api/auth/complete-profile", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (response.status === 401 && retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (retryCount + 1)));
          router.refresh();
          return submitProfile(retryCount + 1);
        }

        return response;
      };

      const response = await submitProfile();
      const data = await response.json();

      if (!response.ok) {
        const serverError =
          typeof data.error === "string" && data.error.startsWith("Unauthorized")
            ? "لم يتم التحقق من جلستك بعد. انتظر لحظة ثم أعد المحاولة."
            : data.error || "فشل في حفظ البيانات";
        setError(serverError);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError("حدث خطأ. يرجى المحاولة مرة أخرى");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="إكمال البيانات الشخصية"
      subtitle="خطوة أخيرة — أكمل بياناتك للوصول إلى الكورسات والمحتوى"
      maxWidth="2xl"
      footer="بياناتك الشخصية آمنة وسرية. لا نشاركها إلا مع فريق التدريس."
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xl p-6 sm:p-8">
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
          >
            {error}
          </div>
        )}

        {initialLoading ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">جاري تحميل بياناتك...</p>
          </div>
        ) : syncFailed ? (
          <div className="py-10 text-center space-y-4">
            <p className="text-slate-600 dark:text-slate-300">
              لم نتمكن من مزامنة حسابك مع المنصة بعد. قد يستغرق ذلك بضع ثوانٍ بعد التسجيل.
            </p>
            <button
              type="button"
              onClick={handleRetrySync}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="أحمد محمد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  رقم الهاتف (الطالب)
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-left"
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  رقم هاتف الوالد/الوالدة
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-left"
                  placeholder="01XXXXXXXXX"
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  السن
                </label>
                <input
                  type="number"
                  required
                  min={6}
                  max={25}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="15"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  المرحلة الدراسية
                </label>
                <select
                  required
                  value={form.educationalStage}
                  onChange={(e) => setForm({ ...form, educationalStage: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">— اختر المرحلة الدراسية —</option>
                  {EDUCATIONAL_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-l from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-md"
            >
              {loading ? "جاري حفظ البيانات..." : "إكمال البيانات والمتابعة"}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
