"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { EDUCATIONAL_STAGES } from "@/types";
import { fetchMeWithRetry } from "@/lib/fetch-me";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface User {
  id: string; email: string; role: string; name?: string;
  phone?: string | null; parentPhone?: string | null; age?: number | null;
  educationalStage?: string | null; createdAt?: string | Date;
  referralCode?: string | null; streakFreezes?: number;
}
interface StudentStats {
  points: number; streak: number; watchedVideos: number; quizzesPassed: number;
  coursesCount: number; hours: number; weekActive: boolean[];
  achievements: { id: string; title: string; description: string; icon: string; unlocked: boolean }[];
  achievementsUnlocked: number;
  weaknesses: { subject: string; avgScore: number; quizCount: number; course: { id: string; title: string } }[];
  activity: number[];
}
interface Course {
  id: string; title: string; subject: string; teacher: { name: string };
  folders: { videos: { watched: boolean }[] }[];
  totalVideos: number; watchedVideos: number;
}
interface ShapedResult {
  serial: number; id: string; quizId: string; quizTitle: string;
  courseTitle: string; subject: string; courseId: string;
  totalQ: number; score: number; pct: number;
  attempted: number; correct: number; hasAnswers: boolean;
  startedAt: string | null; completedAt: string;
  allowRetake: boolean;
}
interface AnswerDetail {
  id: string; question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  selectedAnswer: string | null; correctAnswer: string; isCorrect: boolean;
}
interface WrongQuestion {
  id: string; questionId: string; question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: string; selectedAnswer: string | null;
  result: { quiz: { title: string; folder: { course: { subject: string; title: string } } } };
}
interface BalanceTx {
  id: string; type: string; amount: number; note: string | null; createdAt: string;
}
interface Device {
  id: string; deviceId: string; label?: string | null;
  userAgent?: string | null; ipAddress?: string | null;
  lastSeenAt: string; createdAt: string;
}

/* ─── Nav sections ───────────────────────────────────────────────────────── */
const SECTIONS = [
  { id: "profile",      label: "ملف المستخدم",           icon: "👤" },
  { id: "courses",      label: "كورساتي",                 icon: "📚" },
  { id: "stats",        label: "إحصائياتي",               icon: "📊" },
  { id: "results",      label: "نتائج الاختبارات",        icon: "📝" },
  { id: "wrong",        label: "امتحان من أخطائي",        icon: "🎯" },
  { id: "wallet",       label: "رصيدي",                   icon: "💰" },
  { id: "achievements", label: "الإنجازات",               icon: "🏆" },
  { id: "security",     label: "الأمان",                  icon: "🔒" },
];

const ACH_ICON: Record<string, string> = { rocket: "🚀", bolt: "⚡", flame: "🔥", star: "⭐", medal: "🏅", trophy: "🏆" };

const OPTION_LABELS: Record<string, string> = { A: "أ", B: "ب", C: "ج", D: "د" };

/* ─── Circular ring ─────────────────────────────────────────────────────── */
function Ring({ pct, color, size = 100, label, sublabel }: { pct: number; color: string; size?: number; label: string; sublabel?: string }) {
  const r = 38; const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(pct, 100) / 100) * c}
          strokeLinecap="round" transform="rotate(-90 50 50)" />
        <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--ink)" fontFamily="var(--font-head)">{Math.round(pct)}%</text>
        <text x="50" y="62" textAnchor="middle" fontSize="9" fill="var(--ink-3)">{label}</text>
      </svg>
      {sublabel && <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>{sublabel}</p>}
    </div>
  );
}

/* ─── Answer review modal ───────────────────────────────────────────────── */
function AnswerModal({ resultId, quizTitle, onClose }: { resultId: string; quizTitle: string; onClose: () => void }) {
  const [data, setData] = useState<{ answers: AnswerDetail[]; score: number; totalQ: number } | null>(null);
  useEffect(() => {
    fetch(`/api/student/results/${resultId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.result) setData(d.result); })
      .catch(() => {});
  }, [resultId]);

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--surface-2)", color: "var(--ink-2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 16, margin: 0, color: "var(--ink)" }}>عرض إجابات — {quizTitle}</h3>
        </div>
        <div style={{ padding: 16 }}>
          {!data ? (
            <div className="flex items-center justify-center py-10 gap-2" style={{ color: "var(--ink-3)" }}>
              <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              <span>جارٍ التحميل...</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.answers.map((a, i) => (
                <div key={a.id} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${a.isCorrect ? "var(--brand)" : "var(--danger)"}`, background: a.isCorrect ? "var(--brand-soft)" : "var(--danger-soft)" }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", margin: "0 0 10px" }}>
                    <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>س{i + 1}.</span> {a.question}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {(["A","B","C","D"] as const).map(opt => {
                      const isSelected = a.selectedAnswer === opt;
                      const isCorrect  = a.correctAnswer === opt;
                      return (
                        <div key={opt} style={{
                          padding: "8px 12px", borderRadius: 8, fontSize: 13,
                          border: `1px solid ${isCorrect ? "var(--brand)" : isSelected ? "var(--danger)" : "var(--border)"}`,
                          background: isCorrect ? "var(--brand-soft)" : isSelected ? "var(--danger-soft)" : "var(--surface)",
                          color: isCorrect ? "var(--brand)" : isSelected ? "var(--danger)" : "var(--ink-2)",
                          fontWeight: (isSelected || isCorrect) ? 700 : 400,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontFamily: "var(--font-head)", fontWeight: 800 }}>{OPTION_LABELS[opt]}</span>
                          {a[`option${opt}` as keyof AnswerDetail] as string}
                          {isCorrect && <span style={{ marginRight: "auto" }}>✓</span>}
                          {isSelected && !isCorrect && <span style={{ marginRight: "auto" }}>✗</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AccountPage() {
  const router  = useRouter();
  const [section, setSection]   = useState("profile");
  const [user,    setUser]      = useState<User | null>(null);
  const [resolved, setResolved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState("");
  const [copiedRef,  setCopiedRef]  = useState(false);

  // Lazy section data
  const [stats,   setStats]   = useState<StudentStats | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [results, setResults] = useState<ShapedResult[] | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [wrongQuestions, setWrongQuestions] = useState<{ total: number; bySubject: Record<string, WrongQuestion[]>; questions: WrongQuestion[] } | null>(null);
  const [balance,  setBalance]  = useState<number | null>(null);
  const [balanceTx, setBalanceTx] = useState<BalanceTx[]>([]);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");

  // Results pagination + modal
  const PAGE_SIZE = 10;
  const [resultPage, setResultPage] = useState(1);
  const [answerModal, setAnswerModal] = useState<{ id: string; title: string } | null>(null);

  // Wrong questions exam
  const [wrongFilter, setWrongFilter] = useState("all");
  const [wrongExam, setWrongExam]     = useState<WrongQuestion[] | null>(null);
  const [wrongExamAnswers, setWrongExamAnswers] = useState<Record<string, string>>({});
  const [wrongExamDone, setWrongExamDone]       = useState(false);

  /* ── Auth ── */
  useEffect(() => {
    let cancelled = false;
    fetchMeWithRetry(2, 100).then(me => {
      if (cancelled) return;
      if (!me) { setResolved(true); return; }
      if (me.role === "student" && !me.profileCompleted) { router.replace("/complete-profile"); return; }
      setUser(me as User);
      setResolved(true);
    }).catch(() => { if (!cancelled) setResolved(true); });
    return () => { cancelled = true; };
  }, [router]);

  const EMPTY_STATS: StudentStats = {
    points: 0, streak: 0, watchedVideos: 0, quizzesPassed: 0,
    coursesCount: 0, hours: 0, weekActive: Array(7).fill(false) as boolean[],
    achievements: [], achievementsUnlocked: 0, weaknesses: [],
    activity: Array(28).fill(0) as number[],
  };

  /* ── Lazy fetch — always terminates loading state even on error ── */
  const loadSection = useCallback((s: string) => {
    if ((s === "stats" || s === "achievements") && !stats) {
      fetch("/api/student/stats", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setStats(d ?? EMPTY_STATS))
        .catch(() => setStats(EMPTY_STATS));
    }
    if (s === "courses" && !courses) {
      fetch("/api/courses/enrolled", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setCourses(d?.enrolledCourses ?? []))
        .catch(() => setCourses([]));
    }
    if (s === "results" && !results) {
      fetch("/api/student/results", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setResults(d?.results ?? []))
        .catch(() => setResults([]));
    }
    if (s === "wrong" && !wrongQuestions) {
      fetch("/api/student/wrong-questions", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setWrongQuestions(d ?? { total: 0, bySubject: {}, questions: [] }))
        .catch(() => setWrongQuestions({ total: 0, bySubject: {}, questions: [] }));
    }
    if (s === "wallet" && balance === null) {
      fetch("/api/student/balance", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => { setBalance(d?.balance ?? 0); setBalanceTx(d?.transactions ?? []); })
        .catch(() => { setBalance(0); setBalanceTx([]); });
    }
    if (s === "security" && !devices) {
      fetch("/api/student/security", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => setDevices(d?.devices ?? []))
        .catch(() => setDevices([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, courses, results, devices, wrongQuestions, balance]);

  const go = (s: string) => { setSection(s); loadSection(s); setResultPage(1); };

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); router.push("/login"); router.refresh(); }
    catch { setError("تعذر تسجيل الخروج."); setSigningOut(false); }
  };

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد؟ لا يمكن التراجع.")) return;
    setDeleting(true);
    const res = await fetch("/api/auth/me", { method: "DELETE", credentials: "include" });
    setDeleting(false);
    if (res.ok) { router.push("/login"); router.refresh(); } else setError("تعذر حذف الحساب");
  };

  const redeemBalance = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true); setRedeemMsg("");
    const res = await fetch("/api/student/balance", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: redeemCode.trim().toUpperCase() }),
    });
    const d = await res.json().catch(() => ({}));
    setRedeeming(false);
    if (res.ok) {
      setRedeemMsg(`✅ ${d.message}`);
      setRedeemCode("");
      if (d.credited) setBalance(b => (b ?? 0) + d.credited);
      setBalanceTx(tx => [{ id: Date.now().toString(), type: "credit_code", amount: d.credited, note: redeemCode, createdAt: new Date().toISOString() }, ...tx]);
    } else {
      setRedeemMsg(`❌ ${d.error || "كود غير صحيح"}`);
    }
  };

  const stageLabel = user ? (EDUCATIONAL_STAGES.find(s => s.value === user.educationalStage)?.label ?? user.educationalStage ?? "—") : "—";
  const isStudent  = user?.role === "student";

  // Excel export helper
  const exportExcel = () => {
    if (!results) return;
    const rows = [
      ["التسلسل","اسم الامتحان","الكورس","عدد الأسئلة","النتيجة %","الدرجة","محلولة","صحيحة","وقت البداية","وقت النهاية"],
      ...results.map(r => [
        r.serial, r.quizTitle, r.courseTitle, r.totalQ, r.pct + "%",
        `${r.score} من ${r.totalQ}`, r.attempted, r.correct,
        r.startedAt ? new Date(r.startedAt).toLocaleString("ar-EG") : "—",
        new Date(r.completedAt).toLocaleString("ar-EG"),
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "نتائج_الاختبارات.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Loading states ── */
  if (!resolved) return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar user={null} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
  if (!user) return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar user={null} />
      <div className="flex-1 flex items-center justify-center px-4 text-center">
        <div>
          <div className="text-5xl mb-4">🔒</div>
          <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 22, color: "var(--ink)", marginBottom: 16 }}>يجب تسجيل الدخول أولاً</h2>
          <Link href="/login" className="inline-block no-underline rounded-[12px] text-white hover:opacity-90" style={{ padding: "12px 28px", background: "var(--brand)", fontWeight: 700 }}>تسجيل الدخول</Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  /* ── Pagination helpers ── */
  const pagedResults = results ? results.slice((resultPage - 1) * PAGE_SIZE, resultPage * PAGE_SIZE) : [];
  const totalPages   = results ? Math.ceil(results.length / PAGE_SIZE) : 0;

  /* ── Wrong questions filtered list ── */
  const filteredWrong = wrongQuestions
    ? (wrongFilter === "all" ? wrongQuestions.questions : (wrongQuestions.bySubject[wrongFilter] ?? []))
    : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", fontFamily: "var(--font-body)" }}>
      <Navbar user={{ name: user.name ?? "", role: user.role }} />

      {answerModal && <AnswerModal resultId={answerModal.id} quizTitle={answerModal.title} onClose={() => setAnswerModal(null)} />}

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-6 md:py-10">

        {/* ── Mobile section picker (visible only on small screens) ── */}
        <div className="md:hidden mb-4">
          {/* User info strip */}
          <div className="flex items-center gap-3 mb-3" style={{ padding: "12px 16px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0" style={{ background: "var(--brand)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
            </span>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 700 }}>{isStudent ? "طالب" : user.role}</span>
            </div>
            <button onClick={handleSignOut} disabled={signingOut} className="shrink-0 cursor-pointer border-none rounded-[9px] transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ padding: "8px 12px", background: "var(--danger-soft)", color: "var(--danger)", fontWeight: 700, fontSize: 12, fontFamily: "var(--font-body)" }}>
              {signingOut ? "..." : "خروج"}
            </button>
          </div>
          {/* Section select dropdown */}
          <select
            value={section}
            onChange={e => go(e.target.value)}
            className="w-full cursor-pointer rounded-[12px] border-none outline-none"
            style={{ padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)", fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, appearance: "auto" }}
          >
            {SECTIONS.map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
            ))}
          </select>
        </div>

        {/* ── Desktop layout: sidebar + content ── */}
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">

          {/* ── Sidebar (hidden on mobile) ── */}
          <aside className="hidden md:block rounded-[20px] overflow-hidden self-start sticky top-24" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="text-center p-5" style={{ borderBottom: "1px solid var(--border)", background: "linear-gradient(180deg,var(--brand-soft),transparent)" }}>
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{ background: "var(--brand)", border: "4px solid var(--surface)", boxShadow: "var(--shadow)" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
              </span>
              <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 15, color: "var(--ink)", margin: "0 0 4px" }}>{user.name}</h2>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 700 }}>
                {isStudent ? "طالب" : user.role}
              </span>
              {balance !== null && (
                <div className="mt-3" style={{ padding: "6px 12px", borderRadius: 20, background: "var(--gold-soft)", border: "1px solid var(--gold-2)" }}>
                  <span style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 16, color: "var(--gold-2)" }}>{balance} جنيه</span>
                  <span style={{ fontSize: 11, color: "var(--gold)", display: "block" }}>رصيدك</span>
                </div>
              )}
            </div>
            <nav style={{ padding: "8px 8px" }}>
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => go(s.id)} className="w-full flex items-center gap-3 cursor-pointer border-none transition-colors rounded-[10px]"
                  style={{ padding: "10px 12px", marginBottom: 2, textAlign: "right", fontFamily: "var(--font-body)",
                    background: section === s.id ? "var(--brand-soft)" : "transparent",
                    color: section === s.id ? "var(--brand)" : "var(--ink-2)",
                    fontWeight: section === s.id ? 700 : 600, fontSize: 13.5 }}>
                  <span className="flex-1 text-right">{s.label}</span>
                  <span>{s.icon}</span>
                </button>
              ))}
            </nav>
            <div style={{ padding: "8px 8px", borderTop: "1px solid var(--border)" }}>
              <button onClick={handleSignOut} disabled={signingOut} className="w-full flex items-center justify-between gap-3 cursor-pointer border-none rounded-[10px] transition-colors"
                style={{ padding: "10px 12px", background: "var(--danger-soft)", color: "var(--danger)", fontWeight: 700, fontSize: 13.5, fontFamily: "var(--font-body)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                {signingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
              </button>
            </div>
          </aside>

          {/* ── Content ── */}
          <div>
            {error && (
              <div className="mb-4 flex items-center gap-2" style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid var(--danger)", background: "var(--danger-soft)", color: "var(--danger)", fontSize: 14 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>{error}
              </div>
            )}

            {/* ════ PROFILE ════ */}
            {section === "profile" && (
              <div className="space-y-4">
                <div className="rounded-[20px] overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                  <div style={{ height: 80, background: "linear-gradient(120deg,var(--brand),var(--brand-strong))", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                  </div>
                  <div style={{ padding: "20px 24px 24px" }}>
                    <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 20, color: "var(--ink)", margin: "0 0 16px" }}>معلومات الحساب</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                      {[
                        { label: "الاسم الكامل",    value: user.name || "—",       icon: "👤" },
                        { label: "البريد الإلكتروني",value: user.email,             icon: "📧", ltr: true },
                        { label: "رقم الهاتف",      value: user.phone || "—",      icon: "📱", ltr: true },
                        { label: "رقم ولي الأمر",   value: user.parentPhone || "—",icon: "👨‍👧", ltr: true },
                        { label: "العمر",            value: user.age ? `${user.age} سنة` : "—", icon: "🎂" },
                        { label: "المرحلة",         value: stageLabel || "—",       icon: "🎓" },
                        { label: "تاريخ الانضمام",  value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : "—", icon: "📅", full: true },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-3 justify-end" style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)", gridColumn: item.full ? "1 / -1" : undefined }}>
                          <div style={{ textAlign: "right", minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>{item.label}</div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", direction: item.ltr ? "ltr" : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.value}</div>
                          </div>
                          <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brand-soft)", fontSize: 16 }}>{item.icon}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {isStudent && user.referralCode && (
                  <div className="rounded-[16px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "18px 20px" }}>
                    <div className="flex items-center justify-between mb-2">
                      {(user.streakFreezes ?? 0) > 0 && <span style={{ padding: "4px 10px", borderRadius: 20, background: "var(--brand-soft)", color: "var(--brand)", fontSize: 12, fontWeight: 700 }}>❄️ {user.streakFreezes} تجميد</span>}
                      <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 16, margin: 0, color: "var(--ink)" }}>كود الإحالة 🎁</h3>
                    </div>
                    <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "0 0 12px", textAlign: "right" }}>شارك كودك — كل صديق ينضم تحصل كلاكما على ٥٠ نقطة!</p>
                    <div className="flex items-center gap-3">
                      <button onClick={async () => { const url = `${window.location.origin}/signup?ref=${user.referralCode}`; await navigator.clipboard.writeText(url).catch(() => {}); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }}
                        className="flex items-center gap-1.5 cursor-pointer border-none rounded-[9px]"
                        style={{ padding: "9px 14px", background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--ink-2)", fontSize: 12.5, fontWeight: 600 }}>
                        {copiedRef ? "✓ تم النسخ" : "نسخ الرابط"}
                      </button>
                      <div className="flex-1 text-center" style={{ padding: "10px 16px", borderRadius: 10, background: "var(--brand-soft)", border: "1px solid var(--brand)", fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 20, color: "var(--brand)", letterSpacing: 3 }}>
                        {user.referralCode}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={deleting} className="flex-1 cursor-pointer border-none rounded-[12px] hover:opacity-80 disabled:opacity-50"
                    style={{ padding: "12px", background: "var(--danger-soft)", color: "var(--danger)", fontWeight: 700, fontSize: 13.5, border: "1px solid var(--danger)" }}>
                    {deleting ? "جارٍ الحذف..." : "حذف الحساب"}
                  </button>
                  <Link href="/parent" className="flex-1 text-center no-underline rounded-[12px] hover:opacity-80"
                    style={{ padding: "12px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink-2)", fontWeight: 700, fontSize: 13.5 }}>
                    بوابة ولي الأمر 👨‍👧
                  </Link>
                </div>
              </div>
            )}

            {/* ════ COURSES ════ */}
            {section === "courses" && (
              <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
                  <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: 0 }}>📚 كورساتي</h2>
                </div>
                {!courses ? <div className="flex items-center justify-center py-10 gap-2" style={{ color: "var(--ink-3)" }}><div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /><span>جارٍ التحميل...</span></div>
                : courses.length === 0 ? <div className="py-10 text-center"><div style={{ fontSize: 36, marginBottom: 8 }}>📭</div><p style={{ color: "var(--ink-3)" }}>لم تسجل في أي كورس.</p><Link href="/courses" className="inline-block mt-3 no-underline rounded-[10px] text-white" style={{ padding: "9px 22px", background: "var(--brand)", fontWeight: 700 }}>تصفح الكورسات</Link></div>
                : (
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {courses.map(c => {
                      const total   = c.totalVideos || c.folders?.reduce((s,f) => s + f.videos.length, 0) || 1;
                      const watched = c.watchedVideos || c.folders?.reduce((s,f) => s + f.videos.filter(v => v.watched).length, 0) || 0;
                      const pct     = Math.round((watched / Math.max(total, 1)) * 100);
                      return (
                        <div key={c.id} className="flex items-center gap-3" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                          <Link href={`/courses/${c.id}/learn`} className="shrink-0 no-underline rounded-[9px] text-white hover:opacity-80" style={{ padding: "8px 14px", background: "var(--brand)", fontSize: 13, fontWeight: 700 }}>▶ تعلم</Link>
                          <div className="flex-1 min-w-0">
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 3 }}>{c.title}</div>
                            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>{c.subject} · {c.teacher.name}</div>
                            <div style={{ height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#10b981" : "var(--brand)", borderRadius: 3 }} />
                            </div>
                            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>{watched} / {total} فيديو · {pct}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ════ STATS ════ */}
            {section === "stats" && (
              <div className="space-y-4">
                {!stats ? <div className="flex items-center justify-center py-16 gap-2 rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink-3)" }}><div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
                : (
                  <>
                    <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "22px" }}>
                      <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 17, color: "var(--ink)", margin: "0 0 18px", textAlign: "center" }}>⭐ إحصائيات كورساتك ⭐</h3>
                      <div className="flex justify-around flex-wrap gap-4">
                        <Ring pct={stats.hours > 0 ? Math.min((stats.hours / Math.max(stats.hours + 5, 10)) * 100, 100) : 0} color="var(--brand)" label="ساعات التعلم" sublabel={`${stats.hours} ساعة`} />
                        <Ring pct={stats.quizzesPassed > 0 ? Math.round((stats.quizzesPassed / Math.max(stats.quizzesPassed + 5, 10)) * 100) : 0} color="var(--gold-2)" label="الاختبارات" sublabel={`${stats.quizzesPassed} ناجح`} />
                        <Ring pct={stats.watchedVideos > 0 ? Math.min((stats.watchedVideos / Math.max(stats.watchedVideos + 10, 20)) * 100, 100) : 0} color="#8b5cf6" label="الفيديوهات" sublabel={`${stats.watchedVideos} فيديو`} />
                      </div>
                    </div>
                    <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "22px" }}>
                      <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 17, color: "var(--ink)", margin: "0 0 14px", textAlign: "center" }}>⭐ إحصائياتك على المنصة ⭐</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "إجمالي ساعات التعلم",    value: `${stats.hours} ساعة`,      color: "var(--brand)" },
                          { label: "الفيديوهات المشاهدة",    value: `${stats.watchedVideos}`,    color: "var(--brand)" },
                          { label: "الاختبارات الناجحة",     value: `${stats.quizzesPassed}`,    color: "var(--gold-2)" },
                          { label: "النقاط المكتسبة",        value: `${stats.points}`,           color: "var(--gold-2)" },
                          { label: "سلسلة المواظبة",         value: `${stats.streak} يوم 🔥`,   color: "#f97316" },
                          { label: "الكورسات المسجّل بها",   value: `${stats.coursesCount}`,     color: "#8b5cf6" },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between" style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                            <span style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 17, color: item.color }}>{item.value}</span>
                            <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "22px" }}>
                      <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 15, color: "var(--ink)", margin: "0 0 12px" }}>نشاطك — آخر ٢٨ يوماً</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                        {stats.activity.map((v, i) => (
                          <div key={i} style={{ aspectRatio: "1", borderRadius: 5, background: v === 0 ? "var(--border)" : v >= 4 ? "var(--brand)" : v >= 2 ? "var(--brand-soft)" : "rgba(14,110,98,.2)" }} title={`${v} جلسة`} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════ RESULTS — Professional Paginated Table ════ */}
            {section === "results" && (
              <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                <div className="flex items-center justify-between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                  <button onClick={exportExcel} disabled={!results || results.length === 0}
                    className="flex items-center gap-1.5 cursor-pointer border-none rounded-[10px] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                    style={{ padding: "8px 16px", background: "#10b981", fontWeight: 700, fontSize: 13 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    تحميل ملف إكسيل
                  </button>
                  <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: 0 }}>📝 نتائج الاختبارات</h2>
                </div>

                {!results ? (
                  <div className="flex items-center justify-center py-12 gap-2" style={{ color: "var(--ink-3)" }}><div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /><span>جارٍ التحميل...</span></div>
                ) : results.length === 0 ? (
                  <div className="py-12 text-center"><div style={{ fontSize: 36, marginBottom: 8 }}>📋</div><p style={{ color: "var(--ink-3)" }}>لم تؤدِّ أي اختبار بعد.</p></div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 900 }}>
                        <thead>
                          <tr style={{ background: "var(--bg)", borderBottom: "2px solid var(--border)" }}>
                            {["#","اسم الامتحان","عدد الأسئلة","النتيجة","الدرجة","محلولة","صحيحة","الإجابات","وقت البداية","وقت النهاية"].map(h => (
                              <th key={h} className="text-right" style={{ padding: "11px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pagedResults.map((r) => (
                            <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              <td style={{ padding: "12px 14px", color: "var(--ink-3)", fontSize: 13 }}>{r.serial}</td>
                              <td style={{ padding: "12px 14px", maxWidth: 200 }}>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.quizTitle}</div>
                                <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{r.subject}</div>
                              </td>
                              <td style={{ padding: "12px 14px", color: "var(--ink-2)", fontSize: 13, textAlign: "center" }}>{r.totalQ}</td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 800,
                                  background: r.pct >= 80 ? "var(--brand-soft)" : r.pct >= 50 ? "var(--gold-soft)" : "var(--danger-soft)",
                                  color: r.pct >= 80 ? "var(--brand)" : r.pct >= 50 ? "var(--gold-2)" : "var(--danger)",
                                  fontFamily: "var(--font-head)" }}>
                                  {r.pct}%
                                </span>
                              </td>
                              <td style={{ padding: "12px 14px", fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 14, color: "var(--ink)", textAlign: "center" }}>
                                {r.score} من {r.totalQ}
                              </td>
                              <td style={{ padding: "12px 14px", color: "var(--ink-2)", fontSize: 13, textAlign: "center" }}>{r.attempted}</td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <span style={{ fontWeight: 800, fontSize: 14, color: "var(--brand)", fontFamily: "var(--font-head)" }}>{r.correct}</span>
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                {r.hasAnswers ? (
                                  <button onClick={() => setAnswerModal({ id: r.id, title: r.quizTitle })}
                                    className="cursor-pointer border-none rounded-[8px] text-white hover:opacity-80 transition-opacity"
                                    style={{ padding: "6px 14px", background: "var(--brand)", fontSize: 12.5, fontWeight: 700 }}>
                                    عرض الإجابات
                                  </button>
                                ) : <span style={{ fontSize: 12, color: "var(--ink-3)" }}>—</span>}
                              </td>
                              <td style={{ padding: "12px 14px", fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                                {r.startedAt ? new Date(r.startedAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </td>
                              <td style={{ padding: "12px 14px", fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                                {new Date(r.completedAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        {[
                          { label: "|◄", action: () => setResultPage(1), disabled: resultPage === 1 },
                          { label: "◄", action: () => setResultPage(p => Math.max(1, p - 1)), disabled: resultPage === 1 },
                          { label: "►", action: () => setResultPage(p => Math.min(totalPages, p + 1)), disabled: resultPage === totalPages },
                          { label: "►|", action: () => setResultPage(totalPages), disabled: resultPage === totalPages },
                        ].map(btn => (
                          <button key={btn.label} onClick={btn.action} disabled={btn.disabled}
                            className="cursor-pointer border-none rounded-[7px] transition-colors disabled:opacity-30"
                            style={{ width: 30, height: 30, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--ink-2)", fontFamily: "monospace" }}>
                            {btn.label}
                          </button>
                        ))}
                      </div>
                      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                        {(resultPage - 1) * PAGE_SIZE + 1}–{Math.min(resultPage * PAGE_SIZE, results.length)} من {results.length}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>صفوف الصفحة: {PAGE_SIZE}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ════ WRONG QUESTIONS EXAM ════ */}
            {section === "wrong" && (
              <div className="space-y-4">
                {!wrongQuestions ? (
                  <div className="flex items-center justify-center py-16 gap-2 rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink-3)" }}><div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
                ) : wrongExamDone ? (
                  /* Results of the special exam */
                  <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "28px 24px" }}>
                    <div className="text-center mb-6">
                      <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
                      <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 24, color: "var(--ink)", margin: "0 0 8px" }}>نتيجة الامتحان الخاص</h2>
                      {(() => {
                        const correct = (wrongExam ?? []).filter(q => wrongExamAnswers[q.questionId] === q.correctAnswer).length;
                        const total   = (wrongExam ?? []).length;
                        const pct     = Math.round((correct / Math.max(total, 1)) * 100);
                        return <>
                          <div style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 40, color: pct >= 70 ? "var(--brand)" : "var(--danger)" }}>{pct}%</div>
                          <p style={{ fontSize: 15, color: "var(--ink-2)" }}>{correct} إجابة صحيحة من {total}</p>
                        </>;
                      })()}
                    </div>
                    <button onClick={() => { setWrongExam(null); setWrongExamAnswers({}); setWrongExamDone(false); }}
                      className="w-full cursor-pointer border-none rounded-[12px] text-white hover:opacity-90 transition-opacity"
                      style={{ padding: "13px", background: "var(--brand)", fontWeight: 700, fontSize: 15 }}>
                      إعادة المحاولة
                    </button>
                  </div>
                ) : wrongExam ? (
                  /* Taking the exam */
                  <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "linear-gradient(120deg,var(--brand-soft),transparent)" }}>
                      <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: 0 }}>🎯 امتحانك الخاص ({wrongExam.length} سؤال)</h2>
                    </div>
                    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                      {wrongExam.map((q, i) => (
                        <div key={q.questionId} style={{ padding: "16px", borderRadius: 14, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                          <p style={{ fontWeight: 700, fontSize: 14.5, color: "var(--ink)", margin: "0 0 12px" }}>
                            <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>س{i + 1}.</span> {q.question}
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {(["A","B","C","D"] as const).map(opt => {
                              const chosen = wrongExamAnswers[q.questionId] === opt;
                              return (
                                <button key={opt} onClick={() => setWrongExamAnswers(prev => ({ ...prev, [q.questionId]: opt }))}
                                  className="flex items-center gap-2 cursor-pointer rounded-[10px] text-right transition-all"
                                  style={{ padding: "10px 14px", border: `1px solid ${chosen ? "var(--brand)" : "var(--border)"}`, background: chosen ? "var(--brand-soft)" : "transparent", fontFamily: "var(--font-body)", fontSize: 13.5, color: chosen ? "var(--brand)" : "var(--ink-2)", fontWeight: chosen ? 700 : 400 }}>
                                  <span style={{ fontFamily: "var(--font-head)", fontWeight: 800, minWidth: 20 }}>{OPTION_LABELS[opt]}</span>
                                  {q[`option${opt}` as keyof WrongQuestion] as string}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => setWrongExamDone(true)}
                        disabled={Object.keys(wrongExamAnswers).length < wrongExam.length}
                        className="w-full cursor-pointer border-none rounded-[12px] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                        style={{ padding: "14px", background: "var(--brand)", fontWeight: 800, fontSize: 16, fontFamily: "var(--font-head)" }}>
                        تسليم الامتحان ({Object.keys(wrongExamAnswers).length}/{wrongExam.length} أجبت)
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Build the exam */
                  <div className="space-y-4">
                    <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "22px 24px" }}>
                      <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 22, color: "var(--ink)", margin: "0 0 8px" }}>
                        كوّن امتحان من أسئلة غلطت فيها قبل كدة
                      </h2>
                      <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "0 0 18px" }}>
                        بنجمعلك كل الأسئلة اللي غلطت فيها وبتعملك امتحان خاص بيك عشان تتدرب عليها وتتعلم من أخطاء الماضي.
                      </p>
                      {wrongQuestions.total === 0 ? (
                        <div className="text-center py-6">
                          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                          <p style={{ fontSize: 15, color: "var(--ink-2)" }}>ما عندكش أسئلة غلطت فيها. استمر!</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <span style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 20, color: "var(--danger)" }}>
                              عندك {wrongQuestions.total} سؤال غلطت فيه
                            </span>
                          </div>
                          {/* Subject filter */}
                          <div className="flex flex-wrap gap-2 mb-5">
                            <button onClick={() => setWrongFilter("all")} className="cursor-pointer border-none rounded-full transition-colors"
                              style={{ padding: "6px 14px", fontSize: 13, fontWeight: 700, background: wrongFilter === "all" ? "var(--brand)" : "var(--surface-2)", color: wrongFilter === "all" ? "#fff" : "var(--ink-2)", border: "1px solid var(--border)" }}>
                              كل المواد ({wrongQuestions.total})
                            </button>
                            {Object.entries(wrongQuestions.bySubject).map(([subj, qs]) => (
                              <button key={subj} onClick={() => setWrongFilter(subj)} className="cursor-pointer border-none rounded-full transition-colors"
                                style={{ padding: "6px 14px", fontSize: 13, fontWeight: 700, background: wrongFilter === subj ? "var(--brand)" : "var(--surface-2)", color: wrongFilter === subj ? "#fff" : "var(--ink-2)", border: "1px solid var(--border)" }}>
                                {subj} ({qs.length})
                              </button>
                            ))}
                          </div>
                          <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", marginBottom: 16 }}>
                            <p style={{ fontSize: 14, color: "var(--ink-2)", margin: 0 }}>
                              <strong style={{ color: "var(--ink)" }}>تعليمات:</strong>{" "}
                              اقرأ التعليمات عشان تفهم الهدف. الهدف إنك تستفيد من غلطاتك السابقة. بناءً على غلطاتك اللي انت اخترتها، هنعملك امتحان خاص تتعلم منه.
                            </p>
                          </div>
                          <button
                            onClick={() => { setWrongExam(filteredWrong); setWrongExamAnswers({}); setWrongExamDone(false); }}
                            disabled={filteredWrong.length === 0}
                            className="w-full cursor-pointer border-none rounded-[12px] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                            style={{ padding: "14px", background: "linear-gradient(135deg,var(--brand),var(--brand-strong))", fontWeight: 800, fontSize: 16, fontFamily: "var(--font-head)", boxShadow: "0 6px 18px -6px var(--brand-shadow)" }}>
                            امتحان خاص بيك 🎯 ({filteredWrong.length} سؤال)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════ WALLET ════ */}
            {section === "wallet" && (
              <div className="space-y-4">
                <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "22px 24px" }}>
                  <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 20, color: "var(--ink)", margin: "0 0 16px" }}>💰 رصيدي</h2>
                  <div className="text-center py-6 rounded-[16px] mb-5" style={{ background: "linear-gradient(135deg,var(--brand),var(--brand-strong))" }}>
                    <div style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 48, color: "#fff" }}>{balance ?? "—"}</div>
                    <div style={{ fontSize: 16, color: "rgba(255,255,255,.8)", marginTop: 4 }}>جنيه مصري</div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>شحن كود رصيد</label>
                    <div className="flex gap-3">
                      <button onClick={redeemBalance} disabled={redeeming || !redeemCode.trim()}
                        className="shrink-0 cursor-pointer border-none rounded-[10px] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                        style={{ padding: "12px 20px", background: "var(--brand)", fontWeight: 700, fontSize: 14 }}>
                        {redeeming ? "..." : "تفعيل"}
                      </button>
                      <input type="text" value={redeemCode} onChange={e => { setRedeemCode(e.target.value.toUpperCase()); setRedeemMsg(""); }}
                        placeholder="أدخل كود الشحن" dir="ltr"
                        className="flex-1 rounded-[10px] text-center font-mono tracking-widest focus:outline-none"
                        style={{ padding: "12px", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 15 }} />
                    </div>
                    {redeemMsg && <p style={{ fontSize: 13.5, marginTop: 10, color: redeemMsg.startsWith("✅") ? "var(--brand)" : "var(--danger)" }}>{redeemMsg}</p>}
                  </div>
                </div>
                {balanceTx.length > 0 && (
                  <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                      <h3 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 16, color: "var(--ink)", margin: 0 }}>سجل المعاملات</h3>
                    </div>
                    <div>
                      {balanceTx.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between" style={{ padding: "13px 18px", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{new Date(tx.createdAt).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                            {tx.note && <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{tx.note}</div>}
                          </div>
                          <span style={{ fontFamily: "var(--font-head)", fontWeight: 900, fontSize: 17, color: tx.amount > 0 ? "var(--brand)" : "var(--danger)" }}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount} جنيه
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════ ACHIEVEMENTS ════ */}
            {section === "achievements" && (
              !stats ? <div className="flex items-center justify-center py-12 gap-2 rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink-3)" }}><div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
              : (
                <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", padding: "22px" }}>
                  <div className="flex items-center justify-between mb-5">
                    <span style={{ padding: "5px 12px", borderRadius: 20, background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 700, fontSize: 13 }}>{stats.achievementsUnlocked} / {stats.achievements.length} مفتوح</span>
                    <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: 0 }}>🏆 الإنجازات</h2>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                    {stats.achievements.map(a => (
                      <div key={a.id} className="text-center rounded-[14px]" style={{ padding: "18px 10px", border: `1px solid ${a.unlocked ? "var(--brand)" : "var(--border)"}`, background: a.unlocked ? "var(--brand-soft)" : "var(--surface-2)", opacity: a.unlocked ? 1 : 0.5 }}>
                        <div style={{ fontSize: 32, marginBottom: 6 }}>{ACH_ICON[a.icon] ?? "🏅"}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)", marginBottom: 3 }}>{a.title}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{a.description}</div>
                        {a.unlocked && <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--brand)", fontWeight: 700 }}>✓ مفتوح</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* ════ SECURITY ════ */}
            {section === "security" && (
              <div className="rounded-[20px]" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
                <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
                  <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: 0 }}>🔒 الأمان والأجهزة</h2>
                </div>
                {!devices ? <div className="flex items-center justify-center py-12 gap-2" style={{ color: "var(--ink-3)" }}><div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" /></div>
                : (
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    {devices.length === 0 && <div className="py-8 text-center" style={{ color: "var(--ink-3)" }}>لا توجد أجهزة مسجّلة.</div>}
                    {devices.map(d => {
                      const ua = d.userAgent ?? ""; const icon = /mobile|android|iphone/i.test(ua) ? "📱" : "🖥️";
                      const browser = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0]?.split("/")[0] ?? "متصفح";
                      return (
                        <div key={d.id} className="flex items-center gap-3" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 26 }}>{icon}</span>
                          <div className="flex-1">
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{d.label || browser}</div>
                            {d.ipAddress && <div style={{ fontSize: 11.5, color: "var(--ink-3)", direction: "ltr", textAlign: "right" }}>IP: {d.ipAddress}</div>}
                            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>آخر نشاط: {new Date(d.lastSeenAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
