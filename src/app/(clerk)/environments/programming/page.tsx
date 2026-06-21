"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import { fetchMeWithRetry, type MeUser } from "@/lib/fetch-me";

const LANGUAGES = [
  {
    id: "javascript",
    name: "JavaScript",
    icon: "⚡",
    color: "from-yellow-400 to-amber-500",
    description: "اكتب وتجرب كود JavaScript مباشرة",
    features: ["Console output", "Error detection", "Real-time execution"],
  },
  {
    id: "python",
    name: "Python",
    icon: "🐍",
    color: "from-blue-400 to-green-500",
    description: "اكتب وتجرب كود Python مباشرة",
    features: ["Console output", "Error detection", "Real-time execution"],
  },
  {
    id: "html-css-js",
    name: "HTML / CSS / JS",
    icon: "🌐",
    color: "from-orange-400 to-red-500",
    description: "أنشئ صفحات ويب كاملة",
    features: ["Live preview", "Console output", "Error detection"],
  },
];

export default function ProgrammingPage() {
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    fetchMeWithRetry(2, 100).then(me => setUser(me)).catch(() => {});
  }, []);

  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user ? { name: user.name, role: user.role } : null} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/environments"
              className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              العودة للبيئات
            </Link>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">البرمجة</h1>
            <p className="text-gray-500 dark:text-gray-400">اختر لغة البرمجة للبدء في التطوير</p>
          </motion.div>

          {/* Language Cards Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {LANGUAGES.map((lang, index) => (
              <motion.div
                key={lang.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -10 }}
              >
                <Link href={`/environments/programming/${lang.id}`}>
                  <div className="h-full bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
                    {/* Header */}
                    <div className={`h-32 bg-gradient-to-br ${lang.color} relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                          backgroundSize: '20px 20px'
                        }} />
                      </div>
                      <div className="relative h-full flex items-center justify-center">
                        <motion.div
                          className="text-6xl"
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {lang.icon}
                        </motion.div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{lang.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{lang.description}</p>
                      
                      {/* Features */}
                      <div className="space-y-2 mb-6">
                        {lang.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {feature}
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <motion.button
                        className="w-full py-3 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ابدأ التطوير
                      </motion.button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </main>
        <Footer />
      </div>
    </ProfileGuard>
  );
}
