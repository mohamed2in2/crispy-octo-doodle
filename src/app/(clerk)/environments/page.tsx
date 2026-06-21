"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import { fetchMeWithRetry, type MeUser } from "@/lib/fetch-me";
import { getIQData, getIQLevel, LEVEL_COLORS, type IQData } from "@/lib/iq-system";

const SUBJECTS = [
  {
    id: "math",
    name: "الرياضيات",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    color: "from-blue-500 to-cyan-500",
    shadow: "shadow-cyan-500/20",
    description: "جبر، هندسة، حساب التفاضل والتكامل",
    available: true,
  },
  {
    id: "physics",
    name: "الفيزياء",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    color: "from-purple-500 to-pink-500",
    shadow: "shadow-purple-500/20",
    description: "ميكانيكا، كهرباء، مغناطيسية",
    available: true,
  },
  {
    id: "chemistry",
    name: "الكيمياء",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    color: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-500/20",
    description: "كيمياء عضوية، غير عضوية، تحليلية",
    available: true,
  },
  {
    id: "biology",
    name: "الأحياء",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "from-teal-400 to-emerald-600",
    shadow: "shadow-teal-500/20",
    description: "خلية، وراثة، تطور",
    available: true,
  },
  {
    id: "programming",
    name: "البرمجة",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    color: "from-orange-400 to-red-500",
    shadow: "shadow-orange-500/20",
    description: "JavaScript, Python, HTML/CSS",
    available: true,
  },
  {
    id: "history",
    name: "التاريخ",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "from-amber-400 to-orange-500",
    shadow: "shadow-amber-500/20",
    description: "تاريخ مصر والعالم",
    available: true,
  },
  {
    id: "geography",
    name: "الجغرافيا",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    color: "from-indigo-400 to-blue-600",
    shadow: "shadow-indigo-500/20",
    description: "خرائط، مناخ، موارد طبيعية",
    available: true,
  },
  {
    id: "languages",
    name: "اللغات",
    icon: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
    color: "from-rose-400 to-pink-600",
    shadow: "shadow-rose-500/20",
    description: "عربي، إنجليزي، فرنسي",
    available: true,
  },
];

export default function EnvironmentsPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [iqData, setIqData] = useState<IQData | null>(null);

  useEffect(() => {
    fetchMeWithRetry(2, 100).then(me => setUser(me)).catch(() => {});
    setIqData(getIQData());
  }, []);

  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
        <Navbar user={user ? { name: user.name, role: user.role } : null} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold mb-6 border border-indigo-100 dark:border-indigo-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002 2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              بيئات التعلم
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">بيئات الكورسات</h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">اختر المادة للدخول إلى بيئة كورسات تفاعلية متخصصة مصممة لاحتياجاتك</p>
          </motion.div>

          {/* IQ Brain Card — full width hero */}
          {iqData && (() => {
            const level = getIQLevel(iqData.overallIQ);
            const lc = LEVEL_COLORS[level] || LEVEL_COLORS["متوسط"];
            const pct = Math.min(100, ((iqData.overallIQ - 200) / 1800) * 100);
            return (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Link href="/environments/iq" className="block group no-underline">
                  <div className="relative rounded-[2rem] overflow-hidden border border-white/10 dark:border-white/5"
                    style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" }}>
                    {/* Decorative blobs */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-40"
                      style={{ background: lc.color }} />
                    <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-[50px] opacity-30"
                      style={{ background: "#7C3AED" }} />

                    <div className="relative z-10 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
                      {/* Ring */}
                      <div className="shrink-0">
                        {(() => {
                          const r = 42; const c = 2 * Math.PI * r;
                          return (
                            <svg width="110" height="110" viewBox="0 0 110 110">
                              <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" />
                              <circle cx="55" cy="55" r={r} fill="none" stroke={lc.color} strokeWidth="8"
                                strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
                                strokeLinecap="round" transform="rotate(-90 55 55)"
                                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }} />
                              <text x="55" y="50" textAnchor="middle" fontSize="22" fontWeight="900" fill="white">{iqData.overallIQ}</text>
                              <text x="55" y="66" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.6)">معدل الذكاء</text>
                              <text x="55" y="80" textAnchor="middle" fontSize="11" fontWeight="700" fill={lc.color}>{level}</text>
                            </svg>
                          );
                        })()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-center sm:text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-2"
                          style={{ background: "rgba(124,58,237,.3)", color: "#C4B5FD", border: "1px solid rgba(124,58,237,.5)" }}>
                          🧠 بيئة الذكاء المعرفي
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white mb-1">معدلي</h2>
                        <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,.6)" }}>
                          {iqData.totalGamesPlayed} جلسة · streak {iqData.streak.current} 🔥
                        </p>
                        {/* Skill mini bars */}
                        <div className="flex gap-1 flex-wrap justify-center sm:justify-end">
                          {(["السرعة","الذاكرة","التركيز","المرونة"] as const).map((label, i) => {
                            const skillKeys = ["speed","memory","attention","flexibility"] as const;
                            const sk = skillKeys[i];
                            const p = Math.min(100, ((iqData.skills[sk].score - 200) / 1800) * 100);
                            const colors = ["#E91E63","#9C27B0","#FF9800","#FF5722"];
                            return (
                              <div key={sk} className="flex flex-col items-center gap-1">
                                <div className="h-12 w-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
                                  <div className="w-full rounded-full transition-all duration-700" style={{ height: `${p}%`, background: colors[i], marginTop: `${100-p}%` }} />
                                </div>
                                <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,.5)" }}>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="shrink-0">
                        <div className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white transition-all group-hover:scale-105"
                          style={{ background: "linear-gradient(135deg,#7C3AED,#534AB7)", boxShadow: "0 8px 24px -4px rgba(124,58,237,.5)" }}>
                          عرض المعدل
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })()}

          {/* Subject Cards Grid */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {SUBJECTS.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {subject.available ? (
                  <Link
                    href={`/environments/${subject.id}`}
                    className="block h-full group"
                  >
                    <SubjectCard subject={subject} />
                  </Link>
                ) : (
                  <div className="h-full group cursor-not-allowed">
                    <SubjectCard subject={subject} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </main>
        <Footer />
      </div>
    </ProfileGuard>
  );
}

function SubjectCard({ subject }: { subject: typeof SUBJECTS[0] }) {
  return (
    <div
      className={`relative h-[280px] bg-white dark:bg-[#151B2B] rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300 ${
        subject.available
          ? "hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10"
          : "opacity-80 grayscale-[30%]"
      }`}
    >
      {/* Top Gradient Glow */}
      <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b ${subject.color} opacity-10 dark:opacity-5`}></div>
      <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${subject.color} rounded-full blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity`}></div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-8">
        
        {/* Top Section */}
        <div className="flex justify-between items-start">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg ${subject.shadow} group-hover:scale-110 transition-transform duration-300`}>
            {subject.icon}
          </div>
          
          {/* Status Pill */}
          {subject.available ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-100 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              متاح الآن
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-full border border-gray-100 dark:border-gray-700">
              قريباً
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all">
            {subject.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
            {subject.description}
          </p>
        </div>
      </div>

    </div>
  );
}
