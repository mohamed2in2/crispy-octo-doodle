"use client";

interface AdminSidebarProps {
  role: "superadmin" | "teacher";
  activeSection: string;
  setActiveSection: (s: string) => void;
  onLogout: () => void;
}

const superadminSections = [
  { id: "overview", icon: "📊", label: "نظرة عامة" },
  { id: "create", icon: "➕", label: "إضافة مدرس" },
];

const teacherSections = [
  { id: "dashboard", icon: "📊", label: "لوحة التحكم" },
  { id: "courses", icon: "📚", label: "الكورسات" },
  { id: "create-course", icon: "➕", label: "كورس جديد" },
  { id: "codes", icon: "🔑", label: "أكواد الوصول" },
  { id: "students", icon: "👨‍🎓", label: "الطلاب" },
];

export function AdminSidebar({ role, activeSection, setActiveSection, onLogout }: AdminSidebarProps) {
  const sections = role === "superadmin" ? superadminSections : teacherSections;

  return (
    <aside className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">م</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm">منصة التعليم</p>
            <p className="text-xs text-gray-400">{role === "superadmin" ? "المشرف العام" : "لوحة المدرس"}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-right ${
              activeSection === s.id
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <span>🚪</span> تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
