"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { EDUCATIONAL_STAGES } from "@/types";
import { fetchMeWithRetry } from "@/lib/fetch-me";
import Link from "next/link";
import { useClerkRuntime } from "@/components/auth/ClerkRuntimeProvider";

export default function AccountPage() {
  const { enabled: clerkEnabled } = useClerkRuntime();

  if (!clerkEnabled) {
    return <GuestAccountPage />;
  }

  return <ClerkAccountPage />;
}

function GuestAccountPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={null} />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="text-6xl mb-2">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">تسجيل الدخول غير متاح في هذه المعاينة</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-7">
            هذا النطاق يعمل بدون Clerk حتى لا يظهر خطأ المفتاح الإنتاجي. افتح التطبيق على alasly.live أو أضف مفتاح Clerk تجريبي لتفعيل الحساب هنا.
          </p>
          <Link href="/login" className="inline-flex px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
            تسجيل الدخول
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ClerkAccountPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    role: string;
    name?: string;
    phone?: string | null;
    age?: number | null;
    educationalStage?: string | null;
    createdAt?: string | Date;
  } | null>(null);
  const [resolved, setResolved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const me = await fetchMeWithRetry(8, 250);

        if (cancelled) {
          return;
        }

        if (!me) {
          setUser(null);
          setResolved(true);
          return;
        }

        if (!me.profileCompleted) {
          router.replace("/complete-profile");
          return;
        }

        setUser(me);
        setResolved(true);
      } catch {
        if (!cancelled) {
          setUser(null);
          setResolved(true);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || (isSignedIn && !resolved)) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">يجب تسجيل الدخول أولاً</h2>
            <Link href="/login" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
              تسجيل الدخول
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">جاري مزامنة حسابك</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              لم نتمكن من تحميل بياناتك بعد. أكمل ملفك الشخصي أو أعد المحاولة.
            </p>
            <Link
              href="/complete-profile"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              إكمال البيانات
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const stageLabel = EDUCATIONAL_STAGES.find((s) => s.value === user.educationalStage)?.label || user.educationalStage || "غير محدد";

  const handleSignOut = async () => {
    setSigningOut(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await signOut({ redirectUrl: "/login" });
    } catch {
      setError("تعذر تسجيل الخروج. حاول مرة أخرى.");
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("هل أنت متأكد من حذف حسابك؟ سيتم حذف بياناتك ولن يمكن التراجع عن ذلك.")) return;

    setDeleting(true);
    setError("");

    const res = await fetch("/api/auth/me", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    setDeleting(false);

    if (!res.ok) {
      setError(data.error || "تعذر حذف الحساب");
      return;
    }

    router.push("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={{ name: user.name ?? "", role: user.role }} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-8">حسابي</h1>

        {/* Profile card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-6">
              <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-2xl border-4 border-white dark:border-gray-700 shadow-xl flex items-center justify-center text-3xl">
                👤
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.role === "student" ? "طالب" : user.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "✉️", label: "البريد الإلكتروني", value: user.email },
                { icon: "📱", label: "رقم الهاتف", value: user.phone || "غير محدد" },
                { icon: "🎂", label: "العمر", value: user.age ? `${user.age} سنة` : "غير محدد" },
                { icon: "🎓", label: "المرحلة الدراسية", value: stageLabel },
                {
                  icon: "📅",
                  label: "تاريخ التسجيل",
                  value: user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
                    : "غير محدد",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{item.label}</p>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Link href="/courses" className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all text-center">
            <div className="text-3xl mb-2">📚</div>
            <p className="font-semibold text-gray-900 dark:text-white">تصفح الكورسات</p>
          </Link>
          <Link href="/library" className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all text-center">
            <div className="text-3xl mb-2">📖</div>
            <p className="font-semibold text-gray-900 dark:text-white">مكتبتي</p>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-800 hover:shadow-md transition-all text-center disabled:opacity-60"
          >
            <div className="text-3xl mb-2">🚪</div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {signingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
            </p>
          </button>
        </div>

        <div className="mt-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-red-800 dark:text-red-300">حذف الحساب</h2>
              <p className="text-sm text-red-700/80 dark:text-red-200/80">سيتم حذف حسابك وكل البيانات المرتبطة به بشكل نهائي.</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold transition-colors"
            >
              {deleting ? "جارٍ الحذف..." : "حذف حسابي"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
