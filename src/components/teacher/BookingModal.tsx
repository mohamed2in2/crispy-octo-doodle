"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type BookingPlanType = "1month" | "3months" | "6months";
export type BookingLanguage = "arabic" | "languages";

export interface BookingPlan {
  type: BookingPlanType;
  label: string;
  sublabel: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  durationDays: number;
  icon: string;
  accent: string;
  accentBg: string;
}

export interface BookingModalProps {
  teacherId?: string;
  bookingEnabled?: boolean;
  arabicEnabled?: boolean;
  languagesEnabled?: boolean;
  priceMonthly1?: number | null;
  priceMonthly3?: number | null;
  priceMonthly6?: number | null;
  originalMonthly3?: number | null;
  originalMonthly6?: number | null;
  langSurcharge1?: number | null;
  langSurcharge3?: number | null;
  langSurcharge6?: number | null;
  enableMonthly1?: boolean;
  enableMonthly3?: boolean;
  enableMonthly6?: boolean;
  // Legacy compatibility props
  priceMonthly?: number | null;
  priceTermly?: number | null;
  priceYearly?: number | null;
  discountMonthly?: number | null;
  discountTermly?: number | null;
  discountYearly?: number | null;
  courseStartDate: string | null;
  bookingContactUrl: string | null;
  accentColor: string;
  teacherName: string;
}

const STAGE_OPTIONS = [
  { value: "sec_1", label: "أولى بكالوريا" },
  { value: "sec_2", label: "ثانية بكالوريا" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function formatArabicDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function buildWhatsAppUrl(
  contactUrl: string | null,
  studentName: string,
  gradeLabel: string,
  plan: BookingPlan,
  language: BookingLanguage,
  teacherName: string,
  startDateStr: string | null
): string {
  let rawNumber = contactUrl ? contactUrl.trim() : "";
  if (rawNumber.startsWith("http")) {
    try {
      const u = new URL(rawNumber);
      rawNumber = u.pathname.replace(/\//g, "") || rawNumber;
    } catch {}
  }
  rawNumber = rawNumber.replace(/[^\d+]/g, "");
  if (rawNumber.startsWith("0")) {
    rawNumber = "2" + rawNumber;
  }
  if (rawNumber && !rawNumber.startsWith("+") && !rawNumber.startsWith("2")) {
    rawNumber = "20" + rawNumber;
  }
  rawNumber = rawNumber.replace("+", "");

  const startDateFormatted = startDateStr ? formatArabicDate(startDateStr) : "";
  const langLabel = language === "languages" ? "لغات" : "عربي";

  let msg = `السلام عليكم أستاذ ${teacherName} 👋\n`;
  if (studentName) msg += `👤 اسم الطالب: ${studentName}\n`;
  if (gradeLabel) msg += `📚 الصف الدراسي: ${gradeLabel}\n`;
  msg += `🌐 لغة الدراسة: ${langLabel}\n`;

  if (plan.originalPrice && plan.originalPrice > plan.price) {
    msg += `💳 خطة الاشتراك: ${plan.label} (${plan.price} جنيه بدلاً من ${plan.originalPrice} جنيه) 🔥\n`;
  } else {
    msg += `💳 خطة الاشتراك: ${plan.label} (${plan.price} جنيه)\n`;
  }

  if (startDateFormatted) msg += `📅 موعد بدء الكورس: ${startDateFormatted}\n`;
  msg += `\nأود الاشتراك ومتابعة تفعيل الحساب. شكراً لك!`;

  const encodedMsg = encodeURIComponent(msg);

  if (rawNumber) {
    return `https://wa.me/${rawNumber}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
}

export function BookingButton({
  teacherId,
  bookingEnabled = true,
  arabicEnabled = true,
  languagesEnabled = true,
  priceMonthly1,
  priceMonthly3,
  priceMonthly6,
  originalMonthly3,
  originalMonthly6,
  langSurcharge1,
  langSurcharge3,
  langSurcharge6,
  enableMonthly1 = true,
  enableMonthly3 = true,
  enableMonthly6 = true,
  priceMonthly,
  priceTermly,
  priceYearly,
  courseStartDate,
  bookingContactUrl,
  accentColor,
  teacherName,
}: BookingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("sec_1");
  const [selectedLanguage, setSelectedLanguage] = useState<BookingLanguage>(
    arabicEnabled ? "arabic" : "languages"
  );
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<BookingPlanType>("3months");

  // Gateway health diagnostic status
  const [gatewayHealth, setGatewayHealth] = useState<{
    sha7nawy: "operational" | "degraded";
    shakeout: "operational" | "degraded";
  }>({ sha7nawy: "operational", shakeout: "operational" });

  // Payment method selection & UI state
  const [payMode, setPayMode] = useState<"wallet" | "fawry" | "balance" | "whatsapp" | "code">("wallet");
  const [walletPhone, setWalletPhone] = useState("");
  const [selectedWalletMethod, setSelectedWalletMethod] = useState<"vf_cash" | "et_cash" | "fawry">("vf_cash");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletMsg, setWalletMsg] = useState("");
  const [walletModal, setWalletModal] = useState<{ reference: string; instructions: string; amount: number } | null>(null);

  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceMsg, setBalanceMsg] = useState("");

  const [code, setCode] = useState("");
  const [codeApplying, setCodeApplying] = useState(false);
  const [codeMsg, setCodeMsg] = useState("");

  // Check auth & fetch user info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setIsLoggedIn(true);
          if (d.user.name) setStudentName(d.user.name);
          if (d.user.educationalStage) setStudentGrade(d.user.educationalStage);
          if (typeof d.user.balance === "number") setUserBalance(d.user.balance);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch gateway health diagnostics
  useEffect(() => {
    fetch("/api/payments/health")
      .then((r) => r.json())
      .then((d) => {
        if (d?.gateways) {
          setGatewayHealth({
            sha7nawy: d.gateways.sha7nawy?.status || "operational",
            shakeout: d.gateways.shakeout?.status || "operational",
          });
        }
      })
      .catch(() => {});
  }, []);

  const refreshBalance = () => {
    fetch("/api/student/balance", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.balance === "number") setUserBalance(d.balance);
      })
      .catch(() => {});
  };

  // Build 1, 3, 6 Month Plans based on teacher profile settings + language surcharges
  const isLang = selectedLanguage === "languages";

  const p1Base = priceMonthly1 ?? priceMonthly ?? 200;
  const p1Surcharge = isLang ? (langSurcharge1 ?? 50) : 0;
  const p1Final = p1Base + p1Surcharge;

  const p3Base = priceMonthly3 ?? priceTermly ?? 500;
  const p3Surcharge = isLang ? (langSurcharge3 ?? 150) : 0;
  const p3Final = p3Base + p3Surcharge;
  const p3OriginalBase = originalMonthly3 ?? (discountTermly ? Math.round(p3Base / (1 - discountTermly / 100)) : Math.round(p3Base * 1.2));
  const p3Original = isLang ? p3OriginalBase + 150 : p3OriginalBase;

  const p6Base = priceMonthly6 ?? priceYearly ?? 1000;
  const p6Surcharge = isLang ? (langSurcharge6 ?? 300) : 0;
  const p6Final = p6Base + p6Surcharge;
  const p6OriginalBase = originalMonthly6 ?? (discountYearly ? Math.round(p6Base / (1 - discountYearly / 100)) : Math.round(p6Base * 1.2));
  const p6Original = isLang ? p6OriginalBase + 300 : p6OriginalBase;

  const plans: BookingPlan[] = [];

  if (enableMonthly1) {
    plans.push({
      type: "1month",
      label: "اشتراك شهر واحد",
      sublabel: "30 يوماً وصول كامل للمحتوى",
      price: p1Final,
      durationDays: 30,
      icon: "⚡",
      accent: "#3B82F6",
      accentBg: "rgba(59,130,246,0.1)",
    });
  }

  if (enableMonthly3) {
    const discPct = Math.round(((p3Original - p3Final) / p3Original) * 100);
    plans.push({
      type: "3months",
      label: "اشتراك 3 شهور",
      sublabel: "90 يوماً مع متابعة واختبارات",
      price: p3Final,
      originalPrice: p3Original,
      discountPercent: discPct > 0 ? discPct : undefined,
      durationDays: 90,
      icon: "📚",
      accent: "#F59E0B",
      accentBg: "rgba(245,158,11,0.1)",
    });
  }

  if (enableMonthly6) {
    const discPct = Math.round(((p6Original - p6Final) / p6Original) * 100);
    plans.push({
      type: "6months",
      label: "اشتراك 6 شهور",
      sublabel: "180 يوماً المسار الأوفر والأشمل",
      price: p6Final,
      originalPrice: p6Original,
      discountPercent: discPct > 0 ? discPct : undefined,
      durationDays: 180,
      icon: "🎓",
      accent: "#10B981",
      accentBg: "rgba(16,185,129,0.1)",
    });
  }

  // Requirement 3: If booking is disabled by teacher, hide the button completely
  if (!bookingEnabled) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        🔒 الحجز مغلق حالياً مع هذا المعلم
      </div>
    );
  }

  const activePlan = plans.find((p) => p.type === selectedPlanType) || plans[0] || {
    type: "1month",
    label: "اشتراك شهر واحد",
    sublabel: "",
    price: 200,
    durationDays: 30,
    icon: "⚡",
    accent: "#3B82F6",
    accentBg: "rgba(59,130,246,0.1)",
  };

  const gradeObj = STAGE_OPTIONS.find((s) => s.value === studentGrade);
  const gradeLabel = gradeObj ? gradeObj.label : studentGrade;

  const handlePayViaGateway = async (plan: BookingPlan, methodId: string) => {
    if (!isLoggedIn) {
      window.location.href = `/login?redirect_url=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const isWallet = methodId === "vf_cash" || methodId === "et_cash";
    if (isWallet && !walletPhone.trim()) {
      setWalletMsg("❌ رقم المحفظة مطلوب لإرسال طلب الخصم");
      return;
    }
    setWalletLoading(true);
    setWalletMsg("");

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price,
          method: methodId,
          number: isWallet ? walletPhone.trim() : "",
          client: studentName || "Student",
          details: `حجز ${plan.label} (${selectedLanguage === "languages" ? "لغات" : "عربي"}) - أستاذ ${teacherName}`,
        }),
      });
      const d = await res.json().catch(() => ({}));
      setWalletLoading(false);

      if (res.ok && d.success) {
        if (d.checkoutUrl) {
          window.location.href = d.checkoutUrl;
          return;
        }
        setWalletModal({
          reference: d.reference || "SO-PENDING",
          instructions: d.instructions || "يرجى اتباع خطوات السداد والموافقة على الخصم",
          amount: plan.price,
        });
      } else {
        setWalletMsg(`❌ ${d.error || "تعذر بدء عملية الدفع"}`);
      }
    } catch {
      setWalletLoading(false);
      setWalletMsg("❌ حدث خطأ أثناء الاتصال ببوابة الدفع الإلكتروني");
    }
  };

  const handlePayViaBalance = async (plan: BookingPlan) => {
    if (!isLoggedIn) {
      setBalanceMsg("❌ يجب تسجيل الدخول للشراء بالرصيد");
      return;
    }
    setBalanceLoading(true);
    setBalanceMsg("");
    try {
      const res = await fetch("/api/teacher/subscribe-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacherId || "",
          planType: plan.type,
          language: selectedLanguage,
        }),
      });
      const d = await res.json().catch(() => ({}));
      setBalanceLoading(false);
      if (res.ok && d.success) {
        setBalanceMsg(`✅ ${d.message}`);
        if (typeof d.newBalance === "number") setUserBalance(d.newBalance);
      } else {
        setBalanceMsg(`❌ ${d.error || "تعذر خصم الرصيد"}`);
      }
    } catch {
      setBalanceLoading(false);
      setBalanceMsg("❌ حدث خطأ أثناء الاتصال بالسيرفر");
    }
  };

  const handleApplyCode = async () => {
    if (!code.trim()) return;
    setCodeApplying(true);
    setCodeMsg("");
    try {
      const res = await fetch("/api/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      setCodeApplying(false);
      if (res.ok) {
        setCodeMsg("✅ تم تفعيل الكود بنجاح!");
        refreshBalance();
      } else {
        setCodeMsg(`❌ ${data.error || "كود غير صحيح أو مستخدم من قبل"}`);
      }
    } catch {
      setCodeApplying(false);
      setCodeMsg("❌ تعذر الاتصال بسيرفر الأكواد");
    }
  };

  return (
    <>
      {/* Booking CTA Button */}
      <div className="flex flex-col items-center gap-2 mt-6">
        <button
          onClick={() => { refreshBalance(); setStep(1); setIsOpen(true); }}
          className="relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-white text-base border-none cursor-pointer transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            boxShadow: `0 8px 32px -8px ${accentColor}80`,
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          احجز الآن
        </button>

        {courseStartDate && (
          <p className="text-sm font-bold mt-1" style={{ color: "var(--ink-muted)" }}>
            <span style={{ color: accentColor }}>📍</span> بدء الكورس: {formatArabicDate(courseStartDate)}
          </p>
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6 overflow-y-auto"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: "rgba(0,0,0,0.65)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
              dir="rtl"
              style={{
                background: "var(--surface, #1a1f2e)",
                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                boxShadow: "0 32px 64px -12px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors"
                style={{ background: "var(--border, rgba(255,255,255,0.1))", color: "var(--ink-muted, #999)" }}
                aria-label="إغلاق"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-2"
                  style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                  حجز الاشتراك مع {teacherName}
                </div>
                <h2 className="text-xl sm:text-2xl font-black" style={{ color: "var(--ink, #fff)" }}>
                  {step === 1 ? "1. تفاصيل الحجز والخطة" : "2. اختيار طريقة السداد"}
                </h2>
              </div>

              {/* ── STEP 1: SUMMARY & SELECTION ── */}
              {step === 1 && (
                <div className="space-y-5">
                  {/* Student Name & Grade Inputs */}
                  <div className="space-y-3 p-4 rounded-2xl" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--ink-muted, #aaa)" }}>👤 اسم الطالب</label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="اكتب اسمك..."
                        className="w-full px-3.5 py-2 rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface,#1a1f2e)] text-[var(--ink,#fff)] text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "var(--ink-muted, #aaa)" }}>📚 الصف الدراسي</label>
                      <select
                        value={studentGrade}
                        onChange={(e) => setStudentGrade(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface,#1a1f2e)] text-[var(--ink,#fff)] text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {STAGE_OPTIONS.map((st) => (
                          <option key={st.value} value={st.value}>{st.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Language Selection (Req 5) */}
                  <div className="p-4 rounded-2xl space-y-2" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                    <label className="block text-xs font-bold" style={{ color: "var(--ink-muted, #aaa)" }}>🌐 اختر لغة الدراسية:</label>

                    {!languagesEnabled ? (
                      <div className="p-3 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 text-center">
                        متاح للحجز باللغة العربية فقط (This teacher teaches Arabic only).
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedLanguage("arabic")}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-2"
                          style={{
                            borderColor: selectedLanguage === "arabic" ? accentColor : "var(--border, rgba(255,255,255,0.1))",
                            background: selectedLanguage === "arabic" ? `${accentColor}20` : "var(--surface, #1a1f2e)",
                            color: selectedLanguage === "arabic" ? accentColor : "var(--ink-muted, #aaa)",
                          }}
                        >
                          🇪🇬 عربي
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLanguage("languages")}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs border cursor-pointer transition-all flex items-center justify-center gap-2"
                          style={{
                            borderColor: selectedLanguage === "languages" ? accentColor : "var(--border, rgba(255,255,255,0.1))",
                            background: selectedLanguage === "languages" ? `${accentColor}20` : "var(--surface, #1a1f2e)",
                            color: selectedLanguage === "languages" ? accentColor : "var(--ink-muted, #aaa)",
                          }}
                        >
                          🇬🇧 لغات (+فرق السعر)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Duration Selection (Req 6: 1m, 3m, 6m) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold" style={{ color: "var(--ink-muted, #aaa)" }}>💳 اختر فترة الاشتراك:</label>
                    {plans.map((plan) => {
                      const isSelected = selectedPlanType === plan.type;
                      return (
                        <div
                          key={plan.type}
                          onClick={() => setSelectedPlanType(plan.type)}
                          className="p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all"
                          style={{
                            background: isSelected ? `${plan.accent}15` : "var(--bg, #0f1420)",
                            border: isSelected ? `2px solid ${plan.accent}` : "1px solid var(--border, rgba(255,255,255,0.08))",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: plan.accentBg }}>
                              {plan.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm" style={{ color: "var(--ink, #fff)" }}>{plan.label}</h4>
                                {plan.discountPercent && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    خصم {plan.discountPercent}%
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{plan.sublabel}</p>
                            </div>
                          </div>

                          <div className="text-left">
                            {plan.originalPrice && plan.originalPrice > plan.price && (
                              <span className="text-xs line-through text-gray-400 font-bold block">
                                {plan.originalPrice} ج.م
                              </span>
                            )}
                            <span className="text-lg font-black" style={{ color: plan.accent }}>
                              {plan.price} ج.م
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 rounded-2xl space-y-1 text-xs" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
                    <div className="flex justify-between text-gray-400"><span>المعلم:</span><span className="font-bold text-white">{teacherName}</span></div>
                    <div className="flex justify-between text-gray-400"><span>المنتج:</span><span className="font-bold text-white">{activePlan.label}</span></div>
                    <div className="flex justify-between text-gray-400"><span>اللغة:</span><span className="font-bold text-white">{selectedLanguage === "languages" ? "لغات" : "عربي"}</span></div>
                    <div className="flex justify-between pt-2 border-t border-gray-800 text-emerald-400 font-black text-sm">
                      <span>إجمالي السداد:</span><span>{activePlan.price} ج.م</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 rounded-xl text-white font-black text-sm cursor-pointer border-none transition-all hover:opacity-90 shadow-md flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
                  >
                    الانتقال لاختيار طريقة الدفع ←
                  </button>
                </div>
              )}

              {/* ── STEP 2: PAYMENT METHODS CARDS ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <button onClick={() => setStep(1)} className="text-emerald-400 font-bold hover:underline bg-transparent border-none cursor-pointer">
                      ← تعديل الخطة واللغة
                    </button>
                    <span className="font-bold text-white">{activePlan.label} ({activePlan.price} ج.م)</span>
                  </div>

                  {/* Method Tabs */}
                  <div className="grid grid-cols-5 gap-1 p-1 rounded-xl" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.1))" }}>
                    <button
                      onClick={() => { setPayMode("wallet"); setSelectedWalletMethod("vf_cash"); }}
                      className="py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-center"
                      style={{ background: payMode === "wallet" ? accentColor : "transparent", color: payMode === "wallet" ? "#fff" : "#aaa" }}
                    >
                      📱 محفظة
                    </button>
                    <button
                      onClick={() => { setPayMode("fawry"); setSelectedWalletMethod("fawry"); }}
                      className="py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-center"
                      style={{ background: payMode === "fawry" ? "#FFCC00" : "transparent", color: payMode === "fawry" ? "#000" : "#aaa" }}
                    >
                      🏪 فوري
                    </button>
                    <button
                      onClick={() => setPayMode("balance")}
                      className="py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-center"
                      style={{ background: payMode === "balance" ? "#D97706" : "transparent", color: payMode === "balance" ? "#fff" : "#aaa" }}
                    >
                      💰 رصيد
                    </button>
                    <button
                      onClick={() => setPayMode("whatsapp")}
                      className="py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-center"
                      style={{ background: payMode === "whatsapp" ? "#25D366" : "transparent", color: payMode === "whatsapp" ? "#fff" : "#aaa" }}
                    >
                      💬 واتساب
                    </button>
                    <button
                      onClick={() => setPayMode("code")}
                      className="py-2 rounded-lg text-xs font-bold border-none cursor-pointer text-center"
                      style={{ background: payMode === "code" ? "#10B981" : "transparent", color: payMode === "code" ? "#fff" : "#aaa" }}
                    >
                      🔑 كود
                    </button>
                  </div>

                  {/* 1. Mobile Wallets (Sha7nawy Gateway) */}
                  {payMode === "wallet" && (
                    <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                      {gatewayHealth.sha7nawy === "degraded" && (
                        <div className="p-2.5 rounded-xl text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 text-center font-bold">
                          ⚠️ بوابة المحافظ تعمل بصورة غير مكتملة حالياً
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedWalletMethod("vf_cash")}
                          className="p-3 rounded-xl text-xs font-bold border cursor-pointer text-right space-y-1"
                          style={{
                            borderColor: selectedWalletMethod === "vf_cash" ? "#E60000" : "rgba(255,255,255,0.1)",
                            background: selectedWalletMethod === "vf_cash" ? "rgba(230,0,0,0.15)" : "#1a1f2e",
                            color: "#fff",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>📱 فودافون كاش</span>
                            <span className="text-[10px] text-gray-400">تأكيد فوري</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-normal">طلب دفع مباشر عبر *9*1#</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedWalletMethod("et_cash")}
                          className="p-3 rounded-xl text-xs font-bold border cursor-pointer text-right space-y-1"
                          style={{
                            borderColor: selectedWalletMethod === "et_cash" ? "#76B900" : "rgba(255,255,255,0.1)",
                            background: selectedWalletMethod === "et_cash" ? "rgba(118,185,0,0.15)" : "#1a1f2e",
                            color: "#fff",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>💚 اتصالات كاش</span>
                            <span className="text-[10px] text-gray-400">تأكيد فوري</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-normal">عبر تطبيق e& Money</p>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-gray-300">رقم المحفظة (11 رقماً):</label>
                        <input
                          type="tel"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          placeholder="01xxxxxxxxx"
                          dir="ltr"
                          className="w-full p-2.5 rounded-xl text-center font-mono text-sm border border-gray-700 bg-gray-900 text-white focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() => handlePayViaGateway(activePlan, selectedWalletMethod)}
                        disabled={walletLoading}
                        className="w-full py-3.5 rounded-xl text-white font-bold text-sm cursor-pointer border-none transition-all hover:opacity-90 shadow-md disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #E60000, #b30000)" }}
                      >
                        {walletLoading ? "جارٍ إرسال طلب الخصم..." : `خصم ${activePlan.price} ج.م من المحفظة 📱`}
                      </button>

                      {walletMsg && <p className="text-xs font-semibold text-center" style={{ color: walletMsg.startsWith("❌") ? "#ef4444" : "#10b981" }}>{walletMsg}</p>}
                    </div>
                  )}

                  {/* 2. Fawry Kiosk Pay (Shake-Out Gateway) */}
                  {payMode === "fawry" && (
                    <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                      {gatewayHealth.shakeout === "degraded" && (
                        <div className="p-2.5 rounded-xl text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 text-center font-bold">
                          ⚠️ بوابة فوري تعمل بصورة غير مكتملة حالياً
                        </div>
                      )}

                      <div className="p-3 rounded-xl text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 leading-relaxed font-semibold">
                        🏪 <strong>فوري باي (Shake-Out Gateway):</strong> سيتم إصدار كود مرجعي كاش. اعرض الكود على أي سوبرماركت أو منفذ فوري للدفع المباشر دون الحاجة لمحفظة إلكترونية.
                      </div>

                      <button
                        onClick={() => handlePayViaGateway(activePlan, "fawry")}
                        disabled={walletLoading}
                        className="w-full py-3.5 rounded-xl text-black font-extrabold text-sm cursor-pointer border-none transition-all hover:opacity-90 shadow-md disabled:opacity-50"
                        style={{ background: "#FFCC00" }}
                      >
                        {walletLoading ? "جارٍ إنشاء الفاتورة..." : `إصدار كود فوري بقيمة ${activePlan.price} ج.م 🏪`}
                      </button>

                      {walletMsg && <p className="text-xs font-semibold text-center" style={{ color: walletMsg.startsWith("❌") ? "#ef4444" : "#10b981" }}>{walletMsg}</p>}
                    </div>
                  )}

                  {/* 3. Account Balance */}
                  {payMode === "balance" && (
                    <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                      <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-gray-900 border border-gray-800">
                        <span className="text-gray-400">رصيدك بالمنصة:</span>
                        <span className="font-black text-amber-400 text-sm">{userBalance !== null ? `${userBalance} ج.م` : "غير معروف"}</span>
                      </div>

                      <button
                        onClick={() => handlePayViaBalance(activePlan)}
                        disabled={balanceLoading || (userBalance !== null && userBalance < activePlan.price)}
                        className="w-full py-3.5 rounded-xl text-white font-bold text-sm cursor-pointer border-none transition-all disabled:opacity-50 hover:opacity-90 shadow-md"
                        style={{ background: "linear-gradient(135deg, #D97706, #B45309)" }}
                      >
                        {balanceLoading ? "جارٍ خصم الرصيد..." : `خصم ${activePlan.price} ج.م من رصيدك 💰`}
                      </button>

                      {userBalance !== null && userBalance < activePlan.price && (
                        <p className="text-xs text-center text-amber-400 font-semibold">
                          ⚠️ رصيدك لا يكفي. يمكنك استخدام تبويب المحفظة 📱 أو الكود 🔑 للشحن.
                        </p>
                      )}
                      {balanceMsg && <p className="text-xs font-semibold text-center" style={{ color: balanceMsg.startsWith("❌") ? "#ef4444" : "#10b981" }}>{balanceMsg}</p>}
                    </div>
                  )}

                  {/* 4. WhatsApp Booking */}
                  {payMode === "whatsapp" && (
                    <button
                      onClick={() => {
                        const waUrl = buildWhatsAppUrl(
                          bookingContactUrl,
                          studentName,
                          gradeLabel,
                          activePlan,
                          selectedLanguage,
                          teacherName,
                          courseStartDate
                        );
                        window.open(waUrl, "_blank");
                      }}
                      className="w-full py-4 rounded-2xl text-base font-black text-white text-center flex items-center justify-center gap-2.5 border-none cursor-pointer transition-all hover:brightness-110 shadow-lg"
                      style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                    >
                      إرسال طلب الحجز عبر الواتساب ➔
                    </button>
                  )}

                  {/* 5. Voucher Access Code */}
                  {payMode === "code" && (
                    <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                      <p className="text-xs font-medium text-center text-gray-400">أدخل كود التفعيل المطبوع:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
                          placeholder="كود الشحن"
                          maxLength={16}
                          dir="ltr"
                          className="flex-1 rounded-xl px-3 py-2.5 text-center font-mono text-sm border border-gray-700 bg-gray-900 text-white focus:outline-none"
                        />
                        <button
                          onClick={handleApplyCode}
                          disabled={codeApplying || !code.trim()}
                          className="rounded-xl px-4 py-2.5 text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 border-none cursor-pointer"
                        >
                          {codeApplying ? "..." : "تفعيل"}
                        </button>
                      </div>
                      {codeMsg && <p className="text-xs font-semibold text-center" style={{ color: codeMsg.startsWith("❌") ? "#ef4444" : "#10b981" }}>{codeMsg}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Instructions Modal */}
              {walletModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.7)" }} onClick={() => setWalletModal(null)}>
                  <div className="w-full max-w-md rounded-2xl p-6 text-center space-y-4 shadow-2xl bg-gray-900 border border-gray-800" onClick={(e) => e.stopPropagation()}>
                    <div className="text-4xl">📲</div>
                    <h3 className="text-lg font-bold text-white">تم إصدار التقديم بنجاح!</h3>
                    <p className="text-xs text-gray-400 font-mono">رقم المرجع: {walletModal.reference}</p>
                    <div className="p-4 rounded-xl space-y-2 text-right text-xs bg-gray-950 border border-gray-800 text-gray-300">
                      <p className="font-bold text-emerald-400">التعليمات:</p>
                      <p>{walletModal.instructions}</p>
                    </div>
                    <button onClick={() => setWalletModal(null)} className="w-full py-2.5 rounded-xl bg-gray-800 text-white text-xs font-bold border-none cursor-pointer">
                      إغلاق
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
