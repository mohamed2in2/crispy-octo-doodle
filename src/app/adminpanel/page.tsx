"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";

async function readJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function AdminPanelLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"superadmin" | "teacher">("teacher");
  const [form, setForm] = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body =
      activeTab === "superadmin"
        ? { role: "superadmin", password: form.password }
        : { role: "teacher", name: form.name, password: form.password };

    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJson<{ error?: string; user?: { role?: string } }>(res);
    setLoading(false);

    if (!res.ok) { setError(data?.error || "تعذر تسجيل الدخول"); return; }

    if (data?.user?.role === "superadmin") {
      router.push("/adminpanel/superadmin");
    } else {
      router.push("/adminpanel/teacher");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <DarkModeToggle />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-white font-bold text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white">لوحة الإدارة</h1>
          <p className="text-gray-400 text-sm mt-1">منصة التعليم الإلكتروني</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6">
          {(["teacher", "superadmin"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(""); setForm({ name: "", password: "" }); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "teacher" ? "👨‍🏫 مدرس" : "👑 المشرف العام"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {activeTab === "teacher" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">الاسم</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="اسم المدرس"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {activeTab === "superadmin" ? "كلمة المرور الرئيسية" : "كلمة المرور"}
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 disabled:opacity-60 text-white font-semibold rounded-xl transition-opacity"
          >
            {loading ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
