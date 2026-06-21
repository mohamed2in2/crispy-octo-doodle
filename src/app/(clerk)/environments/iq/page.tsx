"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import { fetchMeWithRetry, type MeUser } from "@/lib/fetch-me";
import {
  getIQData, getIQLevel, SKILL_LABELS, SKILL_COLORS, LEVEL_COLORS, DASHBOARD_SKILLS,
  type IQData, type IQSkillName,
} from "@/lib/iq-system";

/* ─── Mini bar used per skill ────────────────────────────────────────────── */
function SkillRow({ sk, data }: { sk: IQSkillName; data: IQData["skills"][IQSkillName] }) {
  const pct = Math.min(100, ((data.score - 200) / (2000 - 200)) * 100);
  const lc  = LEVEL_COLORS[data.level] || LEVEL_COLORS["متوسط"];
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: lc.bg, color: lc.color }}>
          {data.level}
        </span>
        <span className="text-sm font-black" style={{ color: "var(--ink)" }}>
          {SKILL_LABELS[sk]} : {data.score.toLocaleString("ar-EG")}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "#E0E0E0" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: SKILL_COLORS[sk] }}
        />
      </div>
    </div>
  );
}

/* ─── Radar-style SVG overview ───────────────────────────────────────────── */
function OverallRing({ iq }: { iq: number }) {
  const pct = Math.min(100, ((iq - 200) / 1800) * 100);
  const r = 54; const c = 2 * Math.PI * r;
  const level = getIQLevel(iq);
  const lc = LEVEL_COLORS[level] || LEVEL_COLORS["متوسط"];
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* Track */}
        <circle cx="70" cy="70" r={r} fill="none" stroke="#E0E0E0" strokeWidth="10" />
        {/* Fill */}
        <circle cx="70" cy="70" r={r} fill="none" stroke={lc.color} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* Score */}
        <text x="70" y="64" textAnchor="middle" fontSize="26" fontWeight="900" fill="#1a1a2e">{iq}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="11" fill="#888">معدل الذكاء</text>
        <text x="70" y="97" textAnchor="middle" fontSize="13" fontWeight="700" fill={lc.color}>{level}</text>
      </svg>
    </div>
  );
}

/* ─── Session history sparkline ──────────────────────────────────────────── */
function Sparkline({ sessions }: { sessions: { score: number; date: number }[] }) {
  if (sessions.length < 2) return <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>العب أكثر لترى تقدمك</p>;
  const last10 = sessions.slice(-10);
  const min = Math.min(...last10.map(s => s.score));
  const max = Math.max(...last10.map(s => s.score));
  const range = max - min || 1;
  const W = 220, H = 50;
  const pts = last10.map((s, i) => {
    const x = (i / (last10.length - 1)) * W;
    const y = H - ((s.score - min) / range) * H;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={H + 10} viewBox={`0 0 ${W} ${H + 10}`} preserveAspectRatio="none">
      <polyline fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {last10.map((s, i) => {
        const x = (i / (last10.length - 1)) * W;
        const y = H - ((s.score - min) / range) * H;
        return <circle key={i} cx={x} cy={y} r="3" fill="#534AB7" />;
      })}
    </svg>
  );
}

/* ─── Comparison bar ─────────────────────────────────────────────────────── */
function ComparisonBar({ label, you, avg, color }: { label: string; you: number; avg: number; color: string }) {
  const maxVal = Math.max(you, avg, 2000);
  const youPct = (you / maxVal) * 100;
  const avgPct = (avg / maxVal) * 100;
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>متوسط الطلاب: {avg}</span>
        <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>{label}</span>
      </div>
      <div className="relative h-3 rounded-full" style={{ background: "#E0E0E0" }}>
        {/* average marker */}
        <div className="absolute top-0 h-full w-0.5 bg-gray-400 rounded-full" style={{ left: `${avgPct}%` }} />
        {/* your bar */}
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${youPct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Subject shortcuts ──────────────────────────────────────────────────── */
const SUBJECT_LINKS = [
  { id: "math",      label: "🔢 رياضيات",  href: "/environments/math" },
  { id: "languages", label: "🗣️ لغات",     href: "/environments/languages" },
  { id: "history",   label: "🏛️ تاريخ",    href: "/environments/history" },
  { id: "geography", label: "🌍 جغرافيا",  href: "/environments/geography" },
  { id: "biology",   label: "🔬 أحياء",    href: "/environments/biology" },
  { id: "physics",   label: "⚡ فيزياء",   href: "/environments/physics" },
];

/* ─── Avg scores for comparison (platform averages, can be server-fetched later) */
const PLATFORM_AVG: Record<IQSkillName, number> = {
  speed: 1050, memory: 1020, attention: 980, flexibility: 970,
  linguistic: 1010, logical: 1040, spatial: 990, problemsolving: 1030,
};

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function IQDashboardPage() {
  const [user, setUser]     = useState<MeUser | null>(null);
  const [iqData, setIqData] = useState<IQData | null>(null);
  const [tab, setTab]       = useState<"perf" | "progress">("perf");
  const [stats, setStats]   = useState<{
    rank: number;
    totalRanked: number;
    averageIQ: number;
    studentCount: number;
    isAdaptive: boolean;
    rankingPeriod: string;
  } | null>(null);

  useEffect(() => {
    fetchMeWithRetry(2, 100).then(me => setUser(me)).catch(() => {});
    setIqData(getIQData());
    const sync = () => setIqData(getIQData());
    window.addEventListener("storage", sync);

    // Fetch monthly placement statistics
    fetch("/api/student/iq")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.rank === "number") {
          setStats({
            rank: data.rank,
            totalRanked: data.totalRanked,
            averageIQ: data.averageIQ,
            studentCount: data.studentCount,
            isAdaptive: data.isAdaptive,
            rankingPeriod: data.rankingPeriod
          });
        }
      })
      .catch(() => {});

    return () => window.removeEventListener("storage", sync);
  }, []);

  const iq = iqData ?? null;

  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen" style={{ background: "#F5F5F5" }}>
        <Navbar user={user ? { name: user.name, role: user.role } : null} />

        <main className="flex-1 max-w-lg mx-auto w-full pb-8">

          {/* ── Tab bar (matches screenshot) ── */}
          <div className="flex border-b" style={{ background: "#fff", borderColor: "#E0E0E0" }}>
            {([["perf", "الأداء"], ["progress", "التقدم"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex-1 py-4 text-sm font-black transition-colors"
                style={{
                  color: tab === id ? "#7C3AED" : "#9E9E9E",
                  borderBottom: tab === id ? "3px solid #7C3AED" : "3px solid transparent",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Header ── */}
          <div className="bg-white px-5 pt-6 pb-4 flex items-center gap-4 border-b" style={{ borderColor: "#E0E0E0" }}>
            <Link href="/environments" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-2xl font-black text-right flex-1" style={{ color: "#1a1a2e" }}>معدلي</h1>
          </div>

          {/* ── PERFORMANCE TAB ── */}
          {tab === "perf" && iq && (
            <div>
              {/* Overall ring */}
              <div className="bg-white py-6 flex justify-center border-b" style={{ borderColor: "#E0E0E0" }}>
                <OverallRing iq={iq.overallIQ} />
              </div>

              {/* Rank and Average statistics card */}
              {stats && (
                <div className="bg-white px-5 py-4 border-b text-right flex flex-col gap-2" style={{ borderColor: "#E0E0E0" }}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black" style={{ color: "#7C3AED" }}>#{stats.rank} <span className="text-xs font-normal" style={{ color: "#9E9E9E" }}>من {stats.totalRanked}</span></span>
                    <span className="font-bold" style={{ color: "#1a1a2e" }}>الترتيب {stats.rankingPeriod === "monthly" ? "هذا الشهر" : "العام"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-black" style={{ color: "#009688" }}>{stats.averageIQ}</span>
                    <span className="font-bold" style={{ color: "#1a1a2e" }}>متوسط ذكاء طلاب التطبيق</span>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="bg-white px-5 py-3 flex justify-around border-b text-center" style={{ borderColor: "#E0E0E0" }}>
                <div>
                  <div className="text-xl font-black" style={{ color: "#1a1a2e" }}>{iq.totalGamesPlayed}</div>
                  <div className="text-xs" style={{ color: "#9E9E9E" }}>جلسات</div>
                </div>
                <div style={{ width: 1, background: "#E0E0E0" }} />
                <div>
                  <div className="text-xl font-black" style={{ color: "#1a1a2e" }}>{iq.streak.current}</div>
                  <div className="text-xs" style={{ color: "#9E9E9E" }}>🔥 streak</div>
                </div>
                <div style={{ width: 1, background: "#E0E0E0" }} />
                <div>
                  <div className="text-xl font-black" style={{ color: "#1a1a2e" }}>{iq.streak.best}</div>
                  <div className="text-xs" style={{ color: "#9E9E9E" }}>أفضل streak</div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-white px-5 pt-5 pb-2">
                {DASHBOARD_SKILLS.map(sk => (
                  <SkillRow key={sk} sk={sk} data={iq.skills[sk]} />
                ))}
              </div>

              {/* Spatial (if played) */}
              {iq.skills.spatial.sessions.length > 0 && (
                <div className="bg-white px-5 pb-2 pt-0">
                  <SkillRow sk="spatial" data={iq.skills.spatial} />
                </div>
              )}

              {/* Comparison — uses real server average when available */}
              <div className="bg-white mt-2 px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs" style={{ color: "#9E9E9E" }}>
                    {stats
                      ? `بناءً على ${stats.totalRanked} طالب`
                      : "متوسط تقديري"}
                  </span>
                  <h2 className="text-lg font-black" style={{ color: "#1a1a2e" }}>مقارنة</h2>
                </div>
                {DASHBOARD_SKILLS.slice(0, 4).map(sk => (
                  <ComparisonBar key={sk} label={SKILL_LABELS[sk]}
                    you={iq.skills[sk].score}
                    avg={stats?.averageIQ ?? PLATFORM_AVG[sk]}
                    color={SKILL_COLORS[sk]} />
                ))}
              </div>

              {/* Quick play shortcuts */}
              <div className="mt-2 px-4 pb-4">
                <h3 className="text-sm font-bold text-right mb-3" style={{ color: "#9E9E9E" }}>العب الآن لتحسين معدلك</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {SUBJECT_LINKS.map(s => (
                    <Link key={s.id} href={s.href}
                      className="text-center py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                      style={{ background: "#fff", border: "1px solid #E0E0E0", color: "#1a1a2e" }}>
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PROGRESS TAB ── */}
          {tab === "progress" && iq && (
            <div>
              {/* Overall trend */}
              <div className="bg-white mt-2 px-5 pt-5 pb-4">
                <h2 className="text-base font-black text-right mb-3" style={{ color: "#1a1a2e" }}>📈 تطور الأداء الكلي</h2>
                {iq.totalGamesPlayed === 0 ? (
                  <div className="py-8 text-center" style={{ color: "#9E9E9E" }}>
                    <div style={{ fontSize: 40 }}>🎮</div>
                    <p className="text-sm mt-2">العب أولاً لترى تقدمك</p>
                    <Link href="/environments" className="inline-block mt-3 px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: "#7C3AED" }}>
                      ابدأ الآن
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "#9E9E9E" }}>IQ: {iq.overallIQ}</span>
                      <span className="text-xs font-bold" style={{ color: "#7C3AED" }}>
                        {iq.lastUpdated ? new Date(iq.lastUpdated).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                    {/* Show per-skill recent trend */}
                    {DASHBOARD_SKILLS.map(sk => {
                      const sessions = iq.skills[sk].sessions;
                      if (sessions.length < 2) return null;
                      const first = sessions[0].score;
                      const last  = sessions[sessions.length - 1].score;
                      const delta = last - first;
                      return (
                        <div key={sk} className="mb-5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold" style={{ color: delta >= 0 ? "#009688" : "#E91E63" }}>
                              {delta >= 0 ? "+" : ""}{delta} {delta >= 0 ? "↑" : "↓"}
                            </span>
                            <span className="text-sm font-black" style={{ color: "#1a1a2e" }}>{SKILL_LABELS[sk]}</span>
                          </div>
                          <Sparkline sessions={sessions} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Per-subject breakdown */}
              <div className="bg-white mt-2 px-5 pt-5 pb-4">
                <h2 className="text-base font-black text-right mb-3" style={{ color: "#1a1a2e" }}>📚 تفصيل المواد</h2>
                {SUBJECT_LINKS.map(s => {
                  // Collect all sessions for this subject
                  const subjectSessions = Object.values(iq.skills)
                    .flatMap(skill => skill.sessions.filter(sess => sess.subject === s.id));
                  const count = subjectSessions.length;
                  if (count === 0) return (
                    <div key={s.id} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "#F5F5F5" }}>
                      <span className="text-xs" style={{ color: "#BDBDBD" }}>لم تلعب بعد</span>
                      <span className="text-sm font-bold" style={{ color: "#9E9E9E" }}>{s.label}</span>
                    </div>
                  );
                  const avgScore = Math.round(subjectSessions.reduce((a, b) => a + b.score, 0) / count);
                  return (
                    <Link key={s.id} href={s.href} className="flex items-center justify-between py-3 border-b" style={{ borderColor: "#F5F5F5" }}>
                      <div className="text-left">
                        <span className="text-xs font-bold" style={{ color: "#009688" }}>{count} جلسة</span>
                        <span className="text-xs ml-2" style={{ color: "#9E9E9E" }}>•</span>
                        <span className="text-xs ml-2" style={{ color: "#9E9E9E" }}>متوسط {avgScore.toLocaleString("ar-EG")}</span>
                      </div>
                      <span className="text-sm font-black" style={{ color: "#1a1a2e" }}>{s.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </main>
        <Footer />
      </div>
    </ProfileGuard>
  );
}
