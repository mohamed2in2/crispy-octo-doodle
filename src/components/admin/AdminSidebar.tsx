"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SECTION_ICONS,
  IconLogout,
  IconMenu,
  IconClose,
} from "./AdminIcons";

interface AdminSidebarProps {
  role: "superadmin" | "admin" | "staff" | "teacher";
  activeSection: string;
  setActiveSection: (s: string) => void;
  onLogout: () => void;
  /** Owner superadmin (Ahmed) — unlocks the owner-only "Instance" section. */
  isOwner?: boolean;
  /** Controlled mobile drawer state. If omitted, the sidebar manages its own
   *  state and renders a built-in floating trigger (keeps legacy pages working). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const superadminSections = [
  { id: "overview", label: "نظرة عامة" },
  { id: "students", label: "المتعلمين" },
  { id: "deleted-students", label: "المتعلمين المرشحون" },
  { id: "teachers", label: "المعلمون" },
  { id: "deleted-teachers", label: "المعلمون المحذوفون" },
  { id: "create", label: "إضافة مدرس" },
  { id: "daily-exams", label: "امتحانات لوحة الشرف" },
  { id: "logs", label: "سجلات النشاط" },
  { id: "staff-accounts", label: "المشرفون والموظفون" },
  { id: "site-text", label: "نصوص الموقع" },
  { id: "advanced-settings", label: "الإعدادات المتقدمة" },
  { id: "errors", label: "مراقبة الأخطاء" },
  { id: "danger-zone", label: "منطقة الخطر" },
];

const adminSections = [
  { id: "overview", label: "نظرة عامة" },
  { id: "students", label: "المتعلمين" },
  { id: "deleted-students", label: "المتعلمين المرشحون" },
  { id: "teachers", label: "المعلمون" },
  { id: "create", label: "إضافة مدرس" },
  { id: "logs", label: "سجلات النشاط" },
  { id: "staff-accounts", label: "المشرفون والموظفون" },
];

const staffSections = [
  { id: "overview", label: "نظرة عامة" },
  { id: "students", label: "المتعلمين" },
  { id: "deleted-students", label: "المتعلمين المرشحون" },
  { id: "teachers", label: "المعلمون" },
  { id: "logs", label: "سجلات النشاط" },
];

const teacherSections = [
  { id: "dashboard", label: "لوحة التحكم" },
  { id: "my-page", label: "صفحتي" },
  { id: "courses", label: "الكورسات" },
  { id: "quiz-results", label: "نتائج الاختبارات" },
  { id: "create-course", label: "كورس جديد" },
  { id: "codes", label: "أكواد الوصول" },
  { id: "students", label: "المتعلمين" },
  { id: "requests", label: "طلبات المتعلمين" },
  { id: "feedback", label: "ملاحظات المتعلمين" },
];

const ROLE_BADGE: Record<string, string> = {
  superadmin: "المشرف العام",
  admin: "مشرف",
  staff: "موظف",
  teacher: "مدرس",
};

function Dot({ className }: { className?: string }) {
  return <span className={`block w-1.5 h-1.5 rounded-full bg-current ${className ?? ""}`} aria-hidden />;
}

export function AdminSidebar({
  role,
  activeSection,
  setActiveSection,
  onLogout,
  isOwner,
  mobileOpen,
  onMobileOpenChange,
}: AdminSidebarProps) {
  const sections =
    role === "superadmin"
      ? isOwner
        ? [...superadminSections, { id: "instance", label: "Instance (المالك)" }]
        : superadminSections
    : role === "admin"   ? adminSections
    : role === "staff"   ? staffSections
    : teacherSections;

  // Uncontrolled fallback: legacy pages that don't pass mobileOpen.
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = mobileOpen !== undefined;
  const open = isControlled ? mobileOpen : internalOpen;
  const setOpen = (v: boolean) => (isControlled ? onMobileOpenChange?.(v) : setInternalOpen(v));

  // Lock body scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelect = (id: string) => {
    setActiveSection(id);
    setOpen(false);
  };

  const Brand = (
    <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
      <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_-4px_rgba(37,99,235,0.6)]">
        <span className="text-white font-black text-lg">C</span>
      </div>
      <div className="min-w-0">
        <p className="font-black text-[var(--ink)] text-sm leading-tight truncate">Code-UP</p>
        <p className="text-[11px] text-[var(--ink-muted)] truncate">{ROLE_BADGE[role] ?? role}</p>
      </div>
    </div>
  );

  const Nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="أقسام لوحة التحكم">
      {sections.map((s) => {
        const Icon = SECTION_ICONS[s.id];
        const active = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            aria-current={active ? "page" : undefined}
            className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-right ${
              active
                ? "bg-sky-500/12 text-sky-500 dark:text-sky-300"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)]"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`admin-rail-${role}`}
                className="absolute inset-y-1.5 start-0 w-0.5 rounded-e-full bg-sky-500"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                aria-hidden
              />
            )}
            <span className="shrink-0 w-5 h-5 flex items-center justify-center">
              {Icon ? <Icon className="w-[18px] h-[18px]" /> : <Dot />}
            </span>
            <span className="truncate flex-1">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );

  const Logout = (
    <div className="p-3 border-t border-[var(--border)]">
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
      >
        <span className="shrink-0 w-5 h-5 flex items-center justify-center">
          <IconLogout className="w-[18px] h-[18px]" />
        </span>
        تسجيل الخروج
      </button>
    </div>
  );

  return (
    <>
      {/* ── Desktop rail ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col h-screen sticky top-0 bg-[var(--surface)] border-e border-[var(--border)]">
        {Brand}
        {Nav}
        {Logout}
      </aside>

      {/* ── Built-in floating trigger (uncontrolled / legacy pages only) ── */}
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="lg:hidden fixed top-3 end-3 z-[var(--z-sticky)] w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--ink)] shadow-sm"
        >
          <IconMenu className="w-5 h-5" />
        </button>
      )}

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-[var(--z-modal)]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-black/55"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
              className="absolute inset-y-0 start-0 w-[82%] max-w-[320px] flex flex-col bg-[var(--surface)] border-e border-[var(--border)] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="قائمة لوحة التحكم"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]">
                <div className="flex-1">{Brand}</div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق القائمة"
                  className="me-3 w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors shrink-0"
                >
                  <IconClose className="w-5 h-5" />
                </button>
              </div>
              {Nav}
              {Logout}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
