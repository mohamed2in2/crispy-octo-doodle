"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { EDUCATIONAL_STAGES } from "@/types";
import { fetchMeWithRetry } from "@/lib/fetch-me";

export default function AccountPage() {
  const router = useRouter();
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
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const me = await fetchMeWithRetry(8, 250);

        if (cancelled) return;

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
  }, [router]);

  if (!resolved) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
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

  const stageLabel = EDUCATIONAL_STAGES.find((s) => s.value === user.educationalStage)?.label || user.educationalStage || "غير محدد";

  const handleSignOut = async () => {
    setSigningOut(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/login");
      router.refresh();
    } catch {
      setError("تعذر تسجيل الخروج. حاول مرة أخرى.");
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("هل أنت متأكد من حذف حسابك؟ سيتم حذف بياناتك ولن يمكن التراجع عن ذلك.")) return;

    setDeleting(true);
    setError("");

    const res = await fetch("/api/auth/me", { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));

    setDeleting(false);

    if (!res.ok) {
      setError(data.error || "تعذر حذف الحساب");
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <Navbar user={{ name: user.name ?? "", role: user.role }} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">إعدادات الحساب</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-[#151B2B] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden mb-8 relative">
          {/* Subtle Banner */}
          <div className="h-32 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/30 blur-[50px] rounded-full"></div>
          </div>
          
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-12 mb-8">
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1A2235] to-[#151B2B] border-4 border-white dark:border-[#0B0F19] shadow-xl flex items-center justify-center shrink-0 overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg className="w-10 h-10 text-indigo-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div className="pb-2">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{user.name}</h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium border border-indigo-100 dark:border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  {user.role === "student" ? "حساب طالب" : user.role}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { 
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, 
                  label: "البريد الإلكتروني", 
                  value: user.email 
                },
                { 
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>, 
                  label: "رقم الهاتف", 
                  value: user.phone || "غير محدد" 
                },
                { 
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" /></svg>, 
                  label: "العمر", 
                  value: user.age ? `${user.age} سنة` : "غير محدد" 
                },
                { 
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>, 
                  label: "المرحلة التدريبية", 
                  value: stageLabel 
                },
                {
                  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                  label: "تاريخ الانضمام",
                  value: user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
                    : "غير محدد",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-[#0F141F] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-indigo-500/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#151B2B] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-sm">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-medium mb-1">{item.label}</p>
                    <p className="font-bold text-gray-900 dark:text-gray-200 text-sm" dir="ltr">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 flex items-center gap-3">
             <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
          </div>
        )}

        <Link
          href="/parent"
          className="group flex items-center justify-between p-5 mb-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-400/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <p className="font-bold text-indigo-900 dark:text-indigo-100 text-sm">بوابة ولي الأمر</p>
              <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mt-0.5">متابعة أداء المتعلم وتقارير الذكاء الاصطناعي</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-indigo-400 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="group flex items-center justify-between p-5 bg-white dark:bg-[#151B2B] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#0F141F] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:text-white group-hover:bg-gray-800 dark:group-hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <p className="font-bold text-gray-900 dark:text-gray-300 text-sm">{signingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transform rotate-180 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="group flex items-center justify-between p-5 bg-white dark:bg-[#151B2B] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-rose-200 dark:hover:border-rose-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#0F141F] border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:text-rose-500 group-hover:bg-rose-50 dark:group-hover:bg-rose-500/10 group-hover:border-rose-200 dark:group-hover:border-rose-500/20 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <p className="font-bold text-gray-900 dark:text-gray-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-sm">{deleting ? "جارٍ حذف الحساب..." : "حذف الحساب"}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
