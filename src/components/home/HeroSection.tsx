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
    <section className="relative overflow-hidden bg-[#0B0F19] min-h-[90vh] flex items-center justify-center pt-16 pb-24 md:pt-20 md:pb-32">
      {/* Subtle Premium Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full md:w-[800px] h-[400px] md:h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0F19]/0 to-transparent opacity-60"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] mix-blend-overlay"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        
        <motion.div variants={heroMainVariants} initial="hidden" animate="visible" className="flex flex-col items-center">
          
          <motion.div 
            variants={HeroHeadingVariants} 
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs md:text-sm font-medium mb-8 md:mb-10 backdrop-blur-md hover:bg-white/10 transition-colors cursor-default"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            أكثر من 1,000 طالب يثقون بنا
          </motion.div>
          
          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-black text-white tracking-tight leading-[1.2] md:leading-[1.1] mb-6 md:mb-8"
            variants={HeroHeadingVariants}
          >
            ارتقِ بتجربتك
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 via-white to-purple-300">
              التعليمية
            </span>
          </motion.h1>
          
          <motion.p
            className="text-gray-400 text-base md:text-xl mb-10 md:mb-12 leading-relaxed max-w-2xl mx-auto font-medium px-2"
            variants={heroDescriptionVariants}
          >
            منصة تعليمية متكاملة مصممة خصيصاً لتسريع وتيرة تعلمك من خلال مسارات تفاعلية، ومشاريع عملية، وإرشاد شخصي مستمر.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full px-4 sm:px-0"
            variants={heroButtonContainerVariants}
          >
            {isLoggedIn ? (
              <motion.div variants={heroButtonVariants} className="w-full sm:w-auto">
                <Link
                  href="/library"
                  className="group relative px-8 py-3.5 md:py-4 bg-white text-[#0B0F19] font-bold rounded-full hover:scale-105 transition-all text-base md:text-lg flex items-center justify-center overflow-hidden w-full sm:w-auto min-w-[200px]"
                >
                  <span className="relative z-10">متابعة التعلم</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
              </motion.div>
            ) : (
              <>
                <motion.div variants={heroButtonVariants} className="w-full sm:w-auto">
                  <Link
                    href="/signup"
                    className="group relative px-8 py-3.5 md:py-4 bg-white text-[#0B0F19] font-bold rounded-full hover:scale-105 transition-all text-base md:text-lg flex items-center justify-center overflow-hidden w-full sm:w-auto min-w-[200px]"
                  >
                    <span className="relative z-10">ابدأ الآن مجاناً</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                </motion.div>
                <motion.div variants={heroButtonVariants} className="w-full sm:w-auto">
                  <Link
                    href="/courses"
                    className="px-8 py-3.5 md:py-4 bg-white/5 border border-white/10 text-white font-bold rounded-full hover:bg-white/10 transition-all text-base md:text-lg flex items-center justify-center w-full sm:w-auto min-w-[200px] backdrop-blur-sm"
                  >
                    استكشف الكورسات
                  </Link>
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}
