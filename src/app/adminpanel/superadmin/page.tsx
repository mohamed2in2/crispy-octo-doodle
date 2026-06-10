"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { useToast } from "@/components/ui/Toast";
import { StudentsSection } from "@/components/admin/superadmin/StudentsSection";
import { TeachersSection } from "@/components/admin/superadmin/TeachersSection";
import { ConfirmActionModal } from "@/components/admin/superadmin/ConfirmActionModal";
import { ActivityLogsSection } from "@/components/admin/superadmin/ActivityLogsSection";
import { DeletedStudentsSection } from "@/components/admin/superadmin/DeletedStudentsSection";
import { StaffAccountsSection } from "@/components/admin/superadmin/StaffAccountsSection";
import { ErrorMonitorSection } from "@/components/admin/superadmin/ErrorMonitorSection";
import { DailyExamsSection } from "@/components/admin/superadmin/DailyExamsSection";

async function readJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

interface Teacher {
  id: string;
  name: string;
  email?: string;
  _count?: { courses?: number };
  courses?: { id: string; title: string; subject: string }[];
  createdAt?: string | Date;
}

const SECTION_TITLES: Record<string, string> = {
  overview: "نظرة عامة",
  students: "إدارة المتعلمين",
  teachers: "إدارة المعلمين",
  create: "إنشاء حساب مدرس",
  "daily-exams": "امتحانات لوحة الشرف",
  "staff-accounts": "المشرفون والموظفون",
  errors: "مراقبة الأخطاء والتحذيرات",
};

export default function SuperadminPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: "", password: "" });
  const [activeSection, setActiveSection] = useState("overview");
  const [deleteTargetTeacher, setDeleteTargetTeacher] = useState<Teacher | null>(null);
  const [userRole, setUserRole] = useState<"superadmin" | "admin" | "staff">("superadmin");

  const fetchTeachers = async () => {
    const res = await fetch("/api/admin/teachers", { credentials: "include" });
    if (res.status === 401) {
      toastError("انتهت جلسة المشرف. سجّل الدخول من لوحة الإدارة.");
      setLoading(false);
      router.replace("/adminpanel");
      return;
    }
    const data = await readJson<{ teachers?: Teacher[]; error?: string }>(res);
    setTeachers(data?.teachers || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const meData = await meRes.json() as { user?: { role?: string } };
      const role = meData?.user?.role;
      if (role === "admin" || role === "staff") setUserRole(role);
      await fetchTeachers();
    };
    void init();
  }, []);

  const createTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTeacher),
    });
    const data = await readJson<{ error?: string }>(res);
    setCreating(false);
    if (res.ok) {
      toastSuccess(`تم إنشاء حساب المعلم "${newTeacher.name}" بنجاح`);
      setNewTeacher({ name: "", password: "" });
      fetchTeachers();
    } else {
      toastError(data?.error || "تعذر إنشاء حساب المعلم");
    }
  };

  const deleteTeacher = async (teacherId: string, teacherName: string, actionPassword: string) => {
    const res = await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionPassword }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      toastSuccess(`تم حذف حساب المعلم "${teacherName}" بنجاح`);
      setDeleteTargetTeacher(null);
      fetchTeachers();
    } else {
      throw new Error(data?.error ?? "تعذر حذف حساب المعلم");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/adminpanel");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-gray-950 text-white">
      <AdminSidebar
        role={userRole}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {SECTION_TITLES[activeSection] ?? activeSection}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/30">
              👑 المشرف العام
            </span>
            <DarkModeToggle />
          </div>
        </div>

        <div className="p-6">
          {activeSection === "overview" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-200 dark:border-gray-700">
                  <div className="text-3xl font-black text-blue-400">{teachers.length}</div>
                  <div className="text-slate-500 dark:text-gray-400 text-sm mt-1">مدرس مسجل</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-200 dark:border-gray-700">
                  <div className="text-3xl font-black text-green-400">
                    {teachers.reduce((a: number, t: Teacher) => a + (t._count?.courses || 0), 0)}
                  </div>
                  <div className="text-slate-500 dark:text-gray-400 text-sm mt-1">إجمالي الكورسات</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-200 dark:border-gray-700">
                  <div className="text-3xl font-black text-purple-400">✓</div>
                  <div className="text-slate-500 dark:text-gray-400 text-sm mt-1">النظام يعمل بشكل جيد</div>
                </div>
              </div>

              {/* Teachers list */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 dark:text-white">قائمة المعلمين</h2>
                  <button
                    onClick={() => setActiveSection("create")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    + إضافة مدرس
                  </button>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-slate-500 dark:text-gray-500">جارٍ التحميل...</div>
                ) : teachers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-gray-500">
                    <div className="text-4xl mb-2">👨‍🏫</div>
                    <p>لا يوجد مدرسون بعد</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {teachers.map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold">
                            {t.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{t.name}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-400">{t._count?.courses || 0} كورس</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 dark:text-gray-500">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString("ar-EG") : ""}
                          </span>
                          <button
                            onClick={() => setDeleteTargetTeacher(t)}
                            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                            aria-label={`حذف ${t.name}`}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === "students" && <StudentsSection userRole={userRole} />}

          {activeSection === "deleted-students" && <DeletedStudentsSection userRole={userRole} />}

          {activeSection === "daily-exams" && <DailyExamsSection />}

          {activeSection === "logs" && <ActivityLogsSection />}

          {activeSection === "staff-accounts" && <StaffAccountsSection userRole={userRole} />}

          {activeSection === "errors" && <ErrorMonitorSection />}

          {deleteTargetTeacher && (
            <ConfirmActionModal
              title="حذف حساب المعلم نهائياً"
              description={`تحذير: سيتم حذف حساب المعلم "‏${deleteTargetTeacher.name}‏" وجميع كورساته نهائياً.`}
              actionLabel="حذف نهائياً"
              variant="danger"
              onConfirm={(password) =>
                deleteTeacher(deleteTargetTeacher.id, deleteTargetTeacher.name, password)
              }
              onClose={() => setDeleteTargetTeacher(null)}
            />
          )}

          {activeSection === "teachers" && <TeachersSection userRole={userRole} />}

          {activeSection === "create" && (
            <div className="max-w-md">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">إنشاء حساب مدرس جديد</h2>

              <form onSubmit={createTeacher} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-200 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">اسم المعلم</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="أ. محمد إبراهيم"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">كلمة المرور</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newTeacher.password}
                    onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
                >
                  {creating ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
