"use client";
import { useState } from "react";

/**
 * Locks a section behind the access password (BULK_DELETE_PASSWORD). Children —
 * and any data they load — are not rendered until the password is verified
 * server-side. Unlock lasts for the browser session only.
 */
export function AccessGate({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const storeKey = `gate_${id}`;
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(storeKey) === "1";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/admin/superadmin/access-gate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("كلمة المرور غير صحيحة");
        return;
      }
      sessionStorage.setItem(storeKey, "1");
      setPassword("");
      setUnlocked(true);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md" dir="rtl">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl">🔒</div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-200/70">
          هذه المنطقة محميّة. أدخل كلمة مرور الوصول للمتابعة.
          <br />
          إن لم تكن تعرفها، اطلبها من المالك (قل له: «أحتاج كلمة مرور الـ bulk»).
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3 text-right">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            placeholder="••••••••"
            autoFocus
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={checking}
            className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {checking ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
