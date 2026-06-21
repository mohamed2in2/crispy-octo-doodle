"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { getResolvedTheme, setThemePreference, type Theme } from "@/lib/theme";

interface NavbarProps {
  user?: { name: string; role: string } | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface SearchResult {
  courses:  { id: string; title: string; subject: string; thumbnailUrl?: string | null; teacher: { name: string } }[];
  teachers: { id: string; name: string; teacherProfile?: { slug: string; photoUrl?: string | null } | null }[];
  videos:   { id: string; title: string; folder: { courseId: string; course: { title: string } } }[];
}

const NAV_LINKS = [
  { href: "/",             label: "الرئيسية" },
  { href: "/courses",      label: "الكورسات" },
  { href: "/environments", label: "بيئات التعلم" },
  { href: "/library",      label: "مكتبتي" },
  { href: "/account",      label: "حسابي" },
];

const NOTIF_ICON: Record<string, string> = {
  streak_milestone: "🔥",
  exam_live:        "🎯",
  grade_resolved:   "📝",
  referral_joined:  "🎁",
};

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("themechange", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("themechange", cb); };
}
const getSnapshot       = (): Theme => getResolvedTheme();
const getServerSnapshot = (): Theme => "light";

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const notifRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme  = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";
  const cycleTheme = () => setThemePreference(isDark ? "light" : "dark");

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  // Close panels on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))  setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Load notifications when panel opens
  useEffect(() => {
    if (!notifOpen || !user) return;
    setNotifLoading(true);
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { notifications?: Notification[]; unreadCount?: number } | null) => {
        if (!d) return;
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [notifOpen, user]);

  // Fetch unread count on mount (lightweight — cached 30s)
  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { unreadCount?: number } | null) => { if (d) setUnreadCount(d.unreadCount ?? 0); })
      .catch(() => {});
  }, [user]);

  // Fetch balance for students
  useEffect(() => {
    if (!user || user.role !== "student") return;
    fetch("/api/student/balance", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { balance?: number } | null) => { if (d) setBalance(d.balance ?? 0); })
      .catch(() => {});
  }, [user]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "POST", credentials: "include" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (r.ok) setSearchResults(await r.json() as SearchResult);
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const hasResults = searchResults && (
    searchResults.courses.length > 0 ||
    searchResults.teachers.length > 0 ||
    searchResults.videos.length > 0
  );

  return (
    <header
      className="sticky top-0 z-[var(--z-sticky)] bg-[var(--surface)] border-b border-[var(--border)]"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div
        className="max-w-[1320px] mx-auto px-3 sm:px-7 h-[60px] sm:h-[74px] grid items-center gap-1.5 sm:gap-[18px]"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-[11px] no-underline justify-self-start" aria-label="Code-UP">
          <span className="w-10 h-10 rounded-[11px] bg-[var(--brand)] flex items-center justify-center shrink-0" style={{ boxShadow: "0 4px 12px -4px var(--brand-shadow)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/>
            </svg>
          </span>
          <span className="hidden sm:flex flex-col leading-[1.15]">
            <b style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 19, color: "var(--ink)", letterSpacing: "-.3px", whiteSpace: "nowrap" }}>Code-UP</b>
            <small style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}>منصة كورسات متميزة</small>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 justify-self-center" role="navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className="no-underline whitespace-nowrap transition-colors"
              style={{ padding: "9px 15px", borderRadius: 10, fontSize: 15, fontWeight: 600,
                color: isActive(link.href) ? "var(--brand)" : "var(--ink-2)",
                background: isActive(link.href) ? "var(--brand-soft)" : "transparent" }}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-[6px] sm:gap-[10px] justify-self-end">
          <span className="hidden sm:block"><StreakFlame role={user?.role} /></span>

          {/* Balance badge — students only, hidden on mobile */}
          {user?.role === "student" && balance !== null && (
            <Link href="/account" aria-label="رصيدي" title="رصيدي"
              className="hidden sm:flex items-center gap-1.5 rounded-[10px] border border-[var(--gold-2)] no-underline transition-all hover:scale-105"
              style={{ padding: "5px 11px", background: "var(--gold-soft)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3m.08 4h.01"/>
              </svg>
              <span style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 14, color: "var(--gold-2)", whiteSpace: "nowrap" }}>{balance} ج</span>
            </Link>
          )}

          {/* Search */}
          <div ref={searchRef} className="md:relative">
            <button type="button" onClick={() => { setSearchOpen((o) => !o); setNotifOpen(false); }}
              aria-label="بحث"
              className="w-11 h-11 sm:w-[38px] sm:h-[38px] flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--border)] transition-colors cursor-pointer">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </button>

            {searchOpen && (
              <div className="absolute top-full mt-2 rounded-[16px] overflow-hidden z-[var(--z-dropdown)] md:right-0 md:left-auto right-3 left-3 md:w-[340px] w-auto"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="ابحث عن كورس، مدرس، فيديو..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); doSearch(e.target.value); }}
                    className="w-full outline-none"
                    style={{ background: "transparent", border: "none", fontSize: 16, color: "var(--ink)", fontFamily: "var(--font-body)" }}
                    dir="rtl"
                  />
                </div>
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {searching && (
                    <div className="flex items-center justify-center gap-2 py-6" style={{ color: "var(--ink-3)" }}>
                      <div className="w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                      <span style={{ fontSize: 13 }}>جارٍ البحث...</span>
                    </div>
                  )}
                  {!searching && searchQuery.length >= 2 && !hasResults && (
                    <div className="py-8 text-center" style={{ color: "var(--ink-3)", fontSize: 13 }}>لا توجد نتائج لـ «{searchQuery}»</div>
                  )}
                  {!searching && hasResults && (
                    <>
                      {searchResults!.courses.length > 0 && (
                        <div style={{ padding: "10px 14px 4px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", margin: "0 0 8px", letterSpacing: 1 }}>الكورسات</p>
                          {searchResults!.courses.map((c) => (
                            <Link key={c.id} href={`/courses/${c.id}`} onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 no-underline rounded-[10px] transition-colors"
                              style={{ padding: "9px 10px", marginBottom: 4 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 8, background: "var(--brand-soft)", fontSize: 16 }}>📚</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{c.subject} · {c.teacher.name}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults!.videos.length > 0 && (
                        <div style={{ padding: "6px 14px 4px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", margin: "0 0 8px", letterSpacing: 1 }}>الفيديوهات</p>
                          {searchResults!.videos.map((v) => (
                            <Link key={v.id} href={`/courses/${v.folder.courseId}/learn`} onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 no-underline rounded-[10px] transition-colors"
                              style={{ padding: "9px 10px", marginBottom: 4 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 8, background: "var(--gold-soft)", fontSize: 16 }}>▶️</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.title}</div>
                                <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{v.folder.course.title}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults!.teachers.length > 0 && (
                        <div style={{ padding: "6px 14px 12px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", margin: "0 0 8px", letterSpacing: 1 }}>المعلمون</p>
                          {searchResults!.teachers.map((t) => (
                            <Link key={t.id} href={t.teacherProfile ? `/${t.teacherProfile.slug}` : "#"} onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 no-underline rounded-[10px] transition-colors"
                              style={{ padding: "9px 10px", marginBottom: 4 }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              <span className="flex items-center justify-center shrink-0 font-bold text-white" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand)", fontSize: 14 }}>{t.name[0]}</span>
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{t.name}</div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {!searching && searchQuery.length < 2 && (
                    <div className="py-6 text-center" style={{ color: "var(--ink-3)", fontSize: 13 }}>اكتب كلمتين أو أكثر للبحث</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button type="button" onClick={cycleTheme} aria-label={isDark ? "وضع فاتح" : "وضع داكن"}
            className="w-11 h-11 sm:w-[38px] sm:h-[38px] flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--border)] transition-colors cursor-pointer">
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>

          {/* Leaderboard cup — hidden on mobile */}
          <Link href="/leaderboard" aria-label="لوحة الشرف" title="لوحة الشرف"
            className="hidden sm:flex w-[38px] h-[38px] items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--gold-soft)] text-[var(--gold-2)] hover:bg-[var(--gold-2)] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17a2 2 0 0 1-.7 1.5L8 20h8l-1.3-1.5a2 2 0 0 1-.7-1.5v-2.3M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          </Link>

          {/* Notification bell */}
          <div ref={notifRef} className="md:relative">
            <button type="button" onClick={() => { setNotifOpen((o) => !o); setSearchOpen(false); }}
              aria-label="الإشعارات" aria-expanded={notifOpen}
              className="relative w-[38px] h-[38px] flex items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:bg-[var(--border)] transition-colors cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-[5px] -left-[5px] min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center border-2 border-[var(--surface)]"
                  style={{ background: "var(--danger)", color: "#fff", fontSize: 10.5, fontWeight: 800 }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute top-full mt-2 rounded-[16px] overflow-hidden z-[var(--z-dropdown)] md:right-0 md:left-auto right-3 left-3 md:w-[320px] w-auto"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                <div className="flex items-center justify-between" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>
                      قراءة الكل
                    </button>
                  )}
                  <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 15, margin: 0, color: "var(--ink)" }}>الإشعارات</h3>
                </div>

                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {notifLoading && (
                    <div className="flex items-center justify-center gap-2 py-8" style={{ color: "var(--ink-3)" }}>
                      <div className="w-4 h-4 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                      <span style={{ fontSize: 13 }}>جارٍ التحميل...</span>
                    </div>
                  )}

                  {!notifLoading && notifications.length === 0 && (
                    <div className="py-10 text-center">
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                      <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: 0 }}>لا توجد إشعارات بعد</p>
                    </div>
                  )}

                  {!notifLoading && notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { if (n.link) router.push(n.link); setNotifOpen(false); }}
                      className={`flex items-start gap-3 transition-colors ${n.link ? "cursor-pointer" : ""}`}
                      style={{
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--border)",
                        background: n.isRead ? "transparent" : "var(--brand-soft)",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.isRead ? "transparent" : "var(--brand-soft)"; }}
                    >
                      <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>{NOTIF_ICON[n.type] ?? "🔔"}</span>
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>{n.title}</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User / auth */}
          {user ? (
            <div className="hidden sm:flex items-center gap-[10px]">
              <Link href={`/student/${user.role === "student" ? "me" : ""}`}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] no-underline"
                style={{ padding: "5px 12px 5px 6px" }}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 800, fontSize: 14 }}>
                  {user.name?.[0] ?? "م"}
                </span>
                <b style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{user.name}</b>
              </Link>
              <button type="button" onClick={handleLogout} className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{ padding: "9px 15px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700, color: "var(--danger)", background: "var(--danger-soft)" }}>
                خروج
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link href="/login" style={{ padding: "9px 14px", fontSize: 14, fontWeight: 600, color: "var(--ink-2)", textDecoration: "none" }}>دخول</Link>
              <Link href="/signup" className="hover:opacity-90 transition-opacity"
                style={{ padding: "9px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "var(--brand)", color: "#fff", textDecoration: "none" }}>
                إنشاء حساب
              </Link>
            </div>
          )}

          {/* Hamburger */}
          <button type="button" className="md:hidden w-11 h-11 rounded-lg flex items-center justify-center text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-colors cursor-pointer"
            onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-nav" role="navigation" className="md:hidden py-3 border-t border-[var(--border)] space-y-0.5 pb-4 px-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined}
              className="block no-underline rounded-[10px] transition-colors"
              style={{ padding: "10px 14px", fontSize: 15, fontWeight: 600,
                color: isActive(link.href) ? "var(--brand)" : "var(--ink-2)",
                background: isActive(link.href) ? "var(--brand-soft)" : "transparent" }}>
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-[var(--border)] mt-2 flex flex-col gap-2">
            {user ? (
              <>
                <span className="text-sm font-medium text-[var(--ink-2)] px-3">{user.name}</span>
                <button type="button" onClick={handleLogout} className="w-full text-center rounded-[10px] cursor-pointer"
                  style={{ padding: "11px 14px", fontSize: 14, fontWeight: 700, color: "var(--danger)", background: "var(--danger-soft)", border: "none" }}>
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-center no-underline rounded-[10px] border border-[var(--border)]" style={{ padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>دخول</Link>
                <Link href="/signup" className="block text-center no-underline rounded-[10px]" style={{ padding: "11px 14px", fontSize: 14, fontWeight: 700, background: "var(--brand)", color: "#fff" }}>إنشاء حساب</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
