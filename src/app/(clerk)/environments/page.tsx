"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ProfileGuard } from "@/components/auth/ProfileGuard";

const SUBJECTS = [
  {
    id: "math",
    name: "الرياضيات",
    icon: "📐",
    color: "from-blue-500 to-cyan-500",
    description: "جبر، هندسة، حساب التفاضل والتكامل",
    available: false,
  },
  {
    id: "physics",
    name: "الفيزياء",
    icon: "⚛️",
    color: "from-purple-500 to-pink-500",
    description: "ميكانيكا، كهرباء، مغناطيسية",
    available: false,
  },
  {
    id: "chemistry",
    name: "الكيمياء",
    icon: "🧪",
    color: "from-green-500 to-emerald-500",
    description: "كيمياء عضوية، غير عضوية، تحليلية",
    available: true,
  },
  {
    id: "biology",
    name: "الأحياء",
    icon: "🧬",
    color: "from-teal-500 to-green-500",
    description: "خلية، وراثة، تطور",
    available: false,
  },
  {
    id: "programming",
    name: "البرمجة",
    icon: "💻",
    color: "from-orange-500 to-red-500",
    description: "JavaScript, Python, HTML/CSS",
    available: true,
  },
  {
    id: "history",
    name: "التاريخ",
    icon: "📜",
    color: "from-amber-500 to-yellow-500",
    description: "تاريخ مصر والعالم",
    available: false,
  },
  {
    id: "geography",
    name: "الجغرافيا",
    icon: "🌍",
    color: "from-indigo-500 to-blue-500",
    description: "خرائط، مناخ، موارد طبيعية",
    available: false,
  },
  {
    id: "languages",
    name: "اللغات",
    icon: "📖",
    color: "from-rose-500 to-pink-500",
    description: "عربي، إنجليزي، فرنسي",
    available: false,
  },
];

export default function EnvironmentsPage() {
  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={{ name: "", role: "student" }} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">البيئات التعليمية</h1>
            <p className="text-gray-500 dark:text-gray-400">اختر المادة للدخول إلى بيئة تعليمية تفاعلية</p>
          </motion.div>

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
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                {subject.available ? (
                  <Link
                    href={`/environments/${subject.id}`}
                    className="block h-full"
                  >
                    <SubjectCard subject={subject} />
                  </Link>
                ) : (
                  <SubjectCard subject={subject} />
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
      className={`relative h-64 rounded-3xl overflow-hidden shadow-xl ${
        subject.available
          ? "cursor-pointer"
          : "cursor-not-allowed opacity-70"
      }`}
    >
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${subject.color}`}
      />

      {/* Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6">
        {/* Icon */}
        <motion.div
          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {subject.icon}
        </motion.div>

        {/* Text */}
        <div>
          <h3 className="text-2xl font-black text-white mb-1">{subject.name}</h3>
          <p className="text-white/80 text-sm mb-3">{subject.description}</p>
          {subject.available ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              متاح الآن
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white/70 text-xs font-medium">
              قريباً
            </div>
          )}
        </div>
      </div>

      {/* Shine Effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0"
        initial={{ x: -100 }}
        whileHover={{ x: 100 }}
        transition={{ duration: 0.6 }}
        style={{ width: "50%" }}
      />
    </div>
  );
}
