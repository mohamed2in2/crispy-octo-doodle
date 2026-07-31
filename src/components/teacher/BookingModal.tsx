"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface BookingPlan {
  type: "monthly" | "termly" | "yearly";
  label: string;
  sublabel: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  icon: string;
  accent: string;
  accentBg: string;
}

interface BookingModalProps {
  priceMonthly: number | null;
  priceTermly: number | null;
  priceYearly: number | null;
  discountMonthly?: number | null;
  discountTermly?: number | null;
  discountYearly?: number | null;
  courseStartDate: string | null;
  bookingContactUrl: string | null;
  accentColor: string;
  teacherName: string;
}

const STAGE_OPTIONS = [
  { value: "primary_4", label: "الصف الرابع الابتدائي" },
  { value: "primary_5", label: "الصف الخامس الابتدائي" },
  { value: "primary_6", label: "الصف السادس الابتدائي" },
  { value: "prep_1", label: "الصف الأول الإعدادي" },
  { value: "prep_2", label: "الصف الثاني الإعدادي" },
  { value: "prep_3", label: "الصف الثالث الإعدادي" },
  { value: "sec_1", label: "الصف الأول الثانوي" },
  { value: "sec_2", label: "الصف الثاني الثانوي" },
  { value: "sec_3", label: "الصف الثالث الثانوي" },
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

  let msg = `السلام عليكم أستاذ ${teacherName} 👋\n`;
  if (studentName) msg += `👤 اسم الطالب: ${studentName}\n`;
  if (gradeLabel) msg += `📚 الصف الدراسي: ${gradeLabel}\n`;

  if (plan.discountPercent && plan.originalPrice) {
    msg += `💳 خطة الاشتراك المطلوبة: ${plan.label} (خصم ${plan.discountPercent}% 🔥 - بسعر ${plan.price} جنيه بدلاً من ${plan.originalPrice} جنيه)\n`;
  } else {
    msg += `💳 خطة الاشتراك المطلوبة: ${plan.label} (${plan.price} جنيه)\n`;
  }

  if (startDateFormatted) msg += `📅 تاريخ بدء الكورس: ${startDateFormatted}\n`;
  msg += `\nأود الاشتراك ومتابعة خطوات التسجيل والتفعيل. شكراً لك!`;

  const encodedMsg = encodeURIComponent(msg);

  if (rawNumber) {
    return `https://wa.me/${rawNumber}?text=${encodedMsg}`;
  }
  return `https://wa.me/?text=${encodedMsg}`;
}

export function BookingButton({
  priceMonthly,
  priceTermly,
  priceYearly,
  discountMonthly,
  discountTermly,
  discountYearly,
  courseStartDate,
  bookingContactUrl,
  accentColor,
  teacherName,
}: BookingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("sec_1");
  const [selectedPlanType, setSelectedPlanType] = useState<"monthly" | "termly" | "yearly" | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          if (d.user.name) setStudentName(d.user.name);
          if (d.user.educationalStage) setStudentGrade(d.user.educationalStage);
        }
      })
      .catch(() => {});
  }, []);

  const createPlan = (
    type: "monthly" | "termly" | "yearly",
    label: string,
    sublabel: string,
    rawPrice: number,
    discountPct: number | null | undefined,
    icon: string,
    accent: string,
    accentBg: string
  ): BookingPlan => {
    const hasDisc = discountPct != null && discountPct > 0 && discountPct <= 100;
    if (hasDisc) {
      const discountedPrice = Math.round(rawPrice * (1 - discountPct! / 100));
      return {
        type,
        label,
        sublabel,
        price: discountedPrice,
        originalPrice: rawPrice,
        discountPercent: discountPct!,
        icon,
        accent,
        accentBg,
      };
    }
    return {
      type,
      label,
      sublabel,
      price: rawPrice,
      icon,
      accent,
      accentBg,
    };
  };

  const plans: BookingPlan[] = [];

  if (priceMonthly != null && priceMonthly > 0) {
    plans.push(createPlan("monthly", "اشتراك شهري", "شهر واحد", priceMonthly, discountMonthly, "📅", "#3B82F6", "rgba(59,130,246,0.1)"));
  }

  if (priceTermly != null && priceTermly > 0) {
    plans.push(createPlan("termly", "اشتراك ترم كامل", "ترم دراسي كامل", priceTermly, discountTermly, "📚", "#F59E0B", "rgba(245,158,11,0.1)"));
  }

  if (priceYearly != null && priceYearly > 0) {
    plans.push(createPlan("yearly", "اشتراك سنوي", "سنة دراسية كاملة", priceYearly, discountYearly, "🎓", "#10B981", "rgba(16,185,129,0.1)"));
  }

  // Find max discount across active plans for badge
  const maxDiscount = plans.reduce((max, p) => (p.discountPercent && p.discountPercent > max ? p.discountPercent : max), 0);

  // Set initial selected plan to highest value / first plan if not set
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanType) {
      setSelectedPlanType(plans[plans.length - 1].type);
    }
  }, [plans, selectedPlanType]);

  if (plans.length === 0 && !courseStartDate) return null;

  const activePlan = plans.find((p) => p.type === selectedPlanType) || plans[0];
  const gradeObj = STAGE_OPTIONS.find((s) => s.value === studentGrade);
  const gradeLabel = gradeObj ? gradeObj.label : studentGrade;

  const handleBookViaWhatsApp = (plan: BookingPlan) => {
    const waUrl = buildWhatsAppUrl(
      bookingContactUrl,
      studentName,
      gradeLabel,
      plan,
      teacherName,
      courseStartDate
    );
    window.open(waUrl, "_blank");
  };

  return (
    <>
      {/* "احجز الان" Button + Start Date */}
      <div className="flex flex-col items-center gap-2 mt-6">
        {plans.length > 0 && (
          <button
            onClick={() => setIsOpen(true)}
            className="relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-white text-base border-none cursor-pointer transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
              boxShadow: `0 8px 32px -8px ${accentColor}80`,
            }}
          >
            {maxDiscount > 0 && (
              <span className="absolute -top-3 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-md animate-bounce">
                خصومات تصل لـ {maxDiscount}% 🔥
              </span>
            )}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            احجز الآن
          </button>
        )}

        {courseStartDate && (
          <p className="text-sm font-bold mt-1" style={{ color: "var(--ink-muted)" }}>
            <span style={{ color: accentColor }}>📍</span>
            {" "}بدء الكورس: {formatArabicDate(courseStartDate)}
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
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6 overflow-y-auto"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: "rgba(0,0,0,0.65)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                  style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                  حجز الاشتراك مع {teacherName}
                </div>

                {maxDiscount > 0 && (
                  <div className="mb-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      🔥 عروض خاصة: خصومات تصل لـ {maxDiscount}% على خطط الاشتراك!
                    </span>
                  </div>
                )}

                <h2 className="text-xl sm:text-2xl font-black" style={{ color: "var(--ink, #fff)" }}>
                  حدد تفاصيل الحجز الخاص بك
                </h2>
                <p className="text-xs sm:text-sm mt-1.5" style={{ color: "var(--ink-muted, #999)" }}>
                  اختر الخطة والصف الدراسي وسنقوم بتجهيز رسالة الحجز مباشرة عبر الواتساب
                </p>
              </div>

              {/* Student Info Inputs */}
              <div className="space-y-4 mb-6 p-4 rounded-2xl" style={{ background: "var(--bg, #0f1420)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-muted, #aaa)" }}>
                    👤 اسم الطالب
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="اكتب اسمك الثلاثي..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface,#1a1f2e)] text-[var(--ink,#fff)] text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--ink-muted, #aaa)" }}>
                    📚 الصف الدراسي / المرحلة
                  </label>
                  <select
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface,#1a1f2e)] text-[var(--ink,#fff)] text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {STAGE_OPTIONS.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Plans Selection */}
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--ink-muted, #aaa)" }}>
                  💳 اختر خطة الاشتراك:
                </label>

                {plans.map((plan, i) => {
                  const isSelected = selectedPlanType === plan.type;
                  return (
                    <motion.div
                      key={plan.type}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08, ease: EASE }}
                    >
                      <div
                        className="relative flex items-center justify-between gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer"
                        style={{
                          background: isSelected ? `${plan.accent}15` : "var(--bg, #0f1420)",
                          border: isSelected ? `2px solid ${plan.accent}` : "1px solid var(--border, rgba(255,255,255,0.08))",
                          boxShadow: isSelected ? `0 0 20px -4px ${plan.accent}35` : "none",
                        }}
                        onClick={() => setSelectedPlanType(plan.type)}
                      >
                        {/* Selected Radio Indicator */}
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-emerald-500" : "border-slate-500"}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                          </div>

                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: plan.accentBg }}>
                            {plan.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm sm:text-base" style={{ color: "var(--ink, #fff)" }}>
                                {plan.label}
                              </h3>
                              {plan.discountPercent && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  -{plan.discountPercent}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: "var(--ink-muted, #888)" }}>
                              {plan.sublabel}
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-left shrink-0">
                          {plan.originalPrice && (
                            <span className="text-xs line-through text-slate-400 font-bold block">
                              {plan.originalPrice} جنيه
                            </span>
                          )}
                          <span className="text-xl font-black" style={{ color: plan.accent }}>
                            {plan.price}
                          </span>
                          <span className="text-xs font-bold mr-1" style={{ color: "var(--ink-muted, #888)" }}>
                            جنيه
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Start Date Footer */}
              {courseStartDate && (
                <p className="text-center text-xs font-bold mb-5 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", color: "var(--ink-muted, #888)" }}>
                  📍 موعد بدء الكورس: <span style={{ color: accentColor }}>{formatArabicDate(courseStartDate)}</span>
                </p>
              )}

              {/* WhatsApp Action Button */}
              {activePlan && (
                <button
                  onClick={() => handleBookViaWhatsApp(activePlan)}
                  className="w-full py-4 rounded-2xl text-base font-black text-white text-center flex items-center justify-center gap-2.5 border-none cursor-pointer transition-all hover:brightness-110 shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    boxShadow: "0 8px 24px -4px rgba(37,211,102,0.4)",
                  }}
                >
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.399.636-1.157 4.227 4.321-1.133.58.337z"/>
                  </svg>
                  إرسال طلب الحجز عبر الواتساب ➔
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
