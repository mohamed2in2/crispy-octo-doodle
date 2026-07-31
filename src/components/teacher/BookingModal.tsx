"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface BookingPlan {
  type: "monthly" | "termly" | "yearly";
  label: string;
  sublabel: string;
  price: number;
  icon: string;
  accent: string;
  accentBg: string;
}

interface BookingModalProps {
  priceMonthly: number | null;
  priceTermly: number | null;
  priceYearly: number | null;
  courseStartDate: string | null;
  bookingContactUrl: string | null;
  accentColor: string;
  teacherName: string;
}

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

export function BookingButton({
  priceMonthly,
  priceTermly,
  priceYearly,
  courseStartDate,
  bookingContactUrl,
  accentColor,
  teacherName,
}: BookingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const plans: BookingPlan[] = [];

  if (priceMonthly != null && priceMonthly > 0) {
    plans.push({
      type: "monthly",
      label: "اشتراك شهري",
      sublabel: "شهر واحد",
      price: priceMonthly,
      icon: "📅",
      accent: "#3B82F6",
      accentBg: "rgba(59,130,246,0.1)",
    });
  }

  if (priceTermly != null && priceTermly > 0) {
    plans.push({
      type: "termly",
      label: "اشتراك ترم كامل",
      sublabel: "ترم دراسي",
      price: priceTermly,
      icon: "📚",
      accent: "#F59E0B",
      accentBg: "rgba(245,158,11,0.1)",
    });
  }

  if (priceYearly != null && priceYearly > 0) {
    plans.push({
      type: "yearly",
      label: "اشتراك سنوي",
      sublabel: "سنة كاملة",
      price: priceYearly,
      icon: "🎓",
      accent: "#10B981",
      accentBg: "rgba(16,185,129,0.1)",
    });
  }

  // Don't render anything if no plans are configured
  if (plans.length === 0 && !courseStartDate) return null;

  const hasBestValue = plans.length > 1;
  // The last plan (longest duration) is typically the best value
  const bestValueType = hasBestValue ? plans[plans.length - 1].type : null;

  return (
    <>
      {/* "احجز الان" Button + Start Date */}
      <div className="flex flex-col items-center gap-2 mt-6">
        {plans.length > 0 && (
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-white text-base border-none cursor-pointer transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]"
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
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: "rgba(0,0,0,0.6)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative w-full max-w-lg rounded-3xl p-6 sm:p-8"
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
                  خطط الاشتراك
                </div>
                <h2 className="text-xl sm:text-2xl font-black" style={{ color: "var(--ink, #fff)" }}>
                  اختر خطة الاشتراك المناسبة
                </h2>
                <p className="text-sm mt-1.5" style={{ color: "var(--ink-muted, #999)" }}>
                  اشترك مع {teacherName} واستفد من جميع الكورسات والمحاضرات
                </p>
              </div>

              {/* Plans Grid */}
              <div className="space-y-3">
                {plans.map((plan, i) => {
                  const isBest = plan.type === bestValueType;
                  return (
                    <motion.div
                      key={plan.type}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08, ease: EASE }}
                    >
                      <div
                        className="relative flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer group"
                        style={{
                          background: isBest ? `${plan.accent}10` : "var(--bg, #0f1420)",
                          border: isBest ? `2px solid ${plan.accent}50` : "1px solid var(--border, rgba(255,255,255,0.08))",
                          boxShadow: isBest ? `0 0 24px -6px ${plan.accent}25` : "none",
                        }}
                        onClick={() => {
                          if (bookingContactUrl) {
                            window.open(bookingContactUrl, "_blank");
                          }
                        }}
                      >
                        {/* Best Value Badge */}
                        {isBest && (
                          <span className="absolute -top-2.5 start-4 px-2.5 py-0.5 rounded-full text-[10px] font-black"
                            style={{ background: plan.accent, color: "#fff" }}>
                            الأفضل قيمة ⭐
                          </span>
                        )}

                        {/* Plan Info */}
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: plan.accentBg }}>
                            {plan.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-base" style={{ color: "var(--ink, #fff)" }}>
                              {plan.label}
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted, #888)" }}>
                              {plan.sublabel}
                            </p>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-left shrink-0">
                          <span className="text-2xl font-black" style={{ color: plan.accent }}>
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

              {/* Contact CTA */}
              {bookingContactUrl && (
                <a
                  href={bookingContactUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 w-full py-3.5 rounded-2xl text-sm font-black text-white text-center block no-underline transition-all hover:brightness-110"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                    boxShadow: `0 8px 24px -6px ${accentColor}50`,
                  }}
                >
                  تواصل للحجز ➔
                </a>
              )}

              {/* Start Date Footer */}
              {courseStartDate && (
                <p className="text-center text-xs font-bold mt-4" style={{ color: "var(--ink-muted, #888)" }}>
                  📍 بدء الكورس: {formatArabicDate(courseStartDate)}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
