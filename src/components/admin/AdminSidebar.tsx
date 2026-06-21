"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconLogout, IconMenu, IconClose, SECTION_ICONS } from "./AdminIcons";

interface AdminSidebarProps {
  role: "superadmin" | "admin" | "staff" | "teacher";
  activeSection: string;
  setActiveSection: (s: string) => void;
  onLogout: () => void;
  isOwner?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const superadminSections = [
  { id: "overview",          label: "نظرة عامة" },
  { id: "students",          label: "المتعلمين" },
  { id: "deleted-students",  label: "المتعلمين المرشحون" },
  { id: "teachers",          label: "المعلمون" },
  { id: "deleted-teachers",  label: "المعلمون المحذوفون" },
  { id: "create",            label: "إضافة مدرس" },
  { id: "wallet",            label: "💰 إدارة الرصيد" },
  { id: "daily-exams",       label: "امتحانات لوحة الشرف" },
  { id: "logs",              label: "سجلات النشاط" },
  { id: "staff-accounts",    label: "المشرفون والموظفون" },
  { id: "site-text",         label: "نصوص الموقع" },
  { id: "advanced-settings", label: "الإعدادات المتقدمة" },
  { id: "errors",            label: "مراقبة الأخطاء" },
  { id: "danger-zone",       label: "منطقة الخطر" },
];

const adminSections = [
  { id: "overview",         label: "نظرة عامة" },
  { id: "students",         label: "المتعلمين" },
  { id: "deleted-students", label: "المتعلمين المرشحون" },
  { id: "teachers",         label: "المعلمون" },
  { id: "create",           label: "إضافة مدرس" },
  { id: "logs",             label: "سجلات النشاط" },
  { id: "staff-accounts",   label: "المشرفون والموظفون" },
];

const staffSections = [
  { id: "overview",         label: "نظرة عامة" },
  { id: "students",         label: "المتعلمين" },
  { id: "deleted-students", label: "المتعلمين المرشحون" },
  { id: "teachers",         label: "المعلمون" },
  { id: "logs",             label: "سجلات النشاط" },
];

const teacherSections = [
  { id: "dashboard",     label: "لوحة التحكم" },
  { id: "my-page",       label: "صفحتي" },
  { id: "courses",       label: "الكورسات" },
  { id: "quiz-results",  label: "نتائج الاختبارات" },
  { id: "create-course", label: "كورس جديد" },
  { id: "codes",         label: "أكواد الوصول" },
  { id: "students",      label: "المتعلمين" },
  { id: "requests",      label: "طلبات المتعلمين" },
  { id: "feedback",      label: "ملاحظات المتعلمين" },
];

const ROLE_BADGE: Record<string, string> = {
  superadmin: "المشرف العام",
  admin:      "مشرف",
  staff:      "موظف",
  teacher:    "مدرس",
};

const ROLE_BADGE_IS_GOLD = (role: string) => ["superadmin", "admin"].includes(role);

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

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = mobileOpen !== undefined;
  const open    = isControlled ? mobileOpen : internalOpen;
  const setOpen = (v: boolean) => (isControlled ? onMobileOpenChange?.(v) : setInternalOpen(v));

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
    <div
      className="flex items-center gap-[11px] justify-end"
      style={{ padding: "22px 20px", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex flex-col items-end leading-[1.2]">
        <b style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 17, color: "var(--ink)", whiteSpace: "nowrap" }}>
          Code-UP
        </b>
        <small
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: ROLE_BADGE_IS_GOLD(role) ? "var(--gold)" : "var(--brand)",
          }}
        >
          {ROLE_BADGE[role] ?? role}
        </small>
      </div>
      <span
        className="flex items-center justify-center shrink-0 text-white font-black text-[17px]"
        style={{ width: 40, height: 40, borderRadius: 11, background: "var(--brand)" }}
      >
        C
      </span>
    </div>
  );

  const Nav = (
    <nav
      className="flex-1 overflow-y-auto"
      style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 3 }}
      aria-label="أقسام لوحة التحكم"
    >
      {sections.map((s) => {
        const Icon   = SECTION_ICONS[s.id];
        const active = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            aria-current={active ? "page" : undefined}
            className="relative w-full flex items-center justify-end gap-[11px] cursor-pointer border-none transition-colors"
            style={{
              padding: "11px 14px",
              borderRadius: 11,
              fontSize: 14.5,
              fontWeight: active ? 700 : 600,
              color: active ? "var(--brand)" : "var(--ink-2)",
              background: active ? "var(--brand-soft)" : "transparent",
              textAlign: "right",
            }}
          >
            {active && (
              <motion.span
                layoutId={`admin-rail-${role}`}
                className="absolute top-2 bottom-2 right-0 w-[3px] rounded-full"
                style={{ background: "var(--brand)" }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                aria-hidden
              />
            )}
            <span className="truncate">{s.label}</span>
            {Icon && (
              <span className="shrink-0 w-5 h-5 flex items-center justify-center opacity-70">
                <Icon className="w-[18px] h-[18px]" />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const Logout = (
    <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-end gap-[10px] cursor-pointer border-none transition-colors"
        style={{
          padding: "12px 14px",
          borderRadius: 11,
          color: "var(--danger)",
          fontWeight: 700,
          fontSize: 15,
          background: "var(--danger-soft)",
          textDecoration: "none",
        }}
      >
        تسجيل الخروج
        <IconLogout className="w-[18px] h-[18px] shrink-0" />
      </button>
    </div>
  );

  return (
    <>
      {/* ── Desktop rail ── */}
      <aside
        className="hidden lg:flex w-64 shrink-0 flex-col h-screen sticky top-0"
        style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
      >
        {Brand}
        {Nav}
        {Logout}
      </aside>

      {/* ── Built-in floating trigger (uncontrolled / legacy pages only) ── */}
      {!isControlled && (
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="lg:hidden fixed top-3 end-3 z-[var(--z-sticky)] w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)", boxShadow: "var(--shadow-sm)" }}
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
              className="absolute inset-y-0 start-0 w-[82%] max-w-[320px] flex flex-col shadow-2xl"
              style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
              role="dialog"
              aria-modal="true"
              aria-label="قائمة لوحة التحكم"
            >
              <div className="flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق القائمة"
                  className="ms-3 w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                  style={{ color: "var(--ink-2)", background: "transparent", border: "none" }}
                >
                  <IconClose className="w-5 h-5" />
                </button>
                <div className="flex-1">{Brand}</div>
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
