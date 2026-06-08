"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  heroMainVariants,
  HeroHeadingVariants,
  heroDescriptionVariants,
  heroButtonContainerVariants,
  heroButtonVariants,
} from "@/lib/animations";

interface HeroSectionProps {
  isLoggedIn: boolean;
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 min-h-[85vh] flex items-center">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full"
          animate={{
            y: [0, 20, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -left-20 w-64 h-64 bg-blue-400/10 rounded-full"
          animate={{
            y: [0, -25, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-indigo-400/10 rounded-full animate-pulse" style={{ animationDuration: "4s" }} />
        <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div className="text-center md:text-right" variants={heroMainVariants} initial="hidden" animate="visible">
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6"
              variants={HeroHeadingVariants}
            >
              تعلّم بذكاء،{" "}
              <span className="text-yellow-300">تفوّق</span>{" "}
              بثقة
            </motion.h1>
            <motion.p
              className="text-blue-100 text-lg md:text-xl mb-8 leading-relaxed"
              variants={heroDescriptionVariants}
            >
              منصة تعليمية للطلاب من الصف السادس الابتدائي حتى الثالث الثانوي — محاضرات، اختبارات فورية، ومرشد ذكي يتابع تقدّمك
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-end"
              variants={heroButtonContainerVariants}
            >
              <motion.div variants={heroButtonVariants} className="w-full sm:w-auto">
                <Link
                  href="/parent"
                  className="px-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-xl text-lg flex items-center justify-center gap-2 w-full"
                  aria-label="بوابة ولي الأمر للمتابعة"
                >
                  <span>بوابة ولي الأمر</span>
                  <span className="text-xl">👨‍👩‍👧‍👦</span>
                </Link>
              </motion.div>
              {isLoggedIn ? (
                <motion.div variants={heroButtonVariants}>
                  <Link
                    href="/courses"
                    className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-lg inline-block"
                    aria-label="تصفح الكورسات المتاحة"
                  >
                    تصفح الكورسات
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div variants={heroButtonVariants}>
                    <Link
                      href="/signup"
                      className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-xl text-lg inline-block"
                      aria-label="إنشاء حساب جديد مجاناً"
                    >
                      ابدأ الآن مجاناً
                    </Link>
                  </motion.div>
                  <motion.div variants={heroButtonVariants}>
                    <Link
                      href="/login"
                      className="px-8 py-4 border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-all text-lg inline-block"
                      aria-label="تسجيل الدخول إلى حسابك"
                    >
                      تسجيل الدخول
                    </Link>
                  </motion.div>
                </>
              )}

          </motion.div>

          </motion.div>

          {/* Hero illustration */}
          <motion.div
            className="hidden md:flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="relative">
              <motion.div
                className="w-80 h-80 bg-white/10 rounded-3xl backdrop-blur-sm border border-white/20 p-6 shadow-2xl"
                animate={{
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Mock course cards */}
                {[
                  { icon: "📐", name: "رياضيات", stage: "الثانوي", color: "bg-blue-500" },
                  { icon: "⚗️", name: "كيمياء", stage: "الثانوي", color: "bg-purple-500" },
                  { icon: "🔬", name: "أحياء", stage: "الإعدادي", color: "bg-green-500" },
                ].map((c, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 bg-white/15 rounded-xl p-3 mb-3 border border-white/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                    style={{ transform: `translateX(${i * -8}px)`, zIndex: 3 - i }}
                    whileHover={{ x: 5 }}
                  >
                    <div className={`w-10 h-10 ${c.color} rounded-lg flex items-center justify-center text-xl`}>
                      {c.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{c.name}</p>
                      <p className="text-blue-200 text-xs">{c.stage}</p>
                    </div>
                    <div className="mr-auto">
                      <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${c.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${60 + i * 15}%` }}
                          transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-3"
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="text-2xl">🏆</div>
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-3"
                animate={{
                  y: [0, 15, 0],
                  rotate: [0, -5, 5, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="text-2xl">🚀</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
