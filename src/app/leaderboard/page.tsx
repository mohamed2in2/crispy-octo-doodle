import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy, Medal, Star, Gift, Clock, Target } from "lucide-react";

/**
 * Group students into a competition tier by the REAL educational-stage values
 * used across the app (primary_* / prep_* / sec_*). The old version checked for
 * `grade_1`…`grade_12`, which never matched any student, so the leaderboard
 * always came back empty. An unknown/empty stage returns [] → no stage filter
 * (show everyone) rather than excluding all.
 */
function getCompetitionTier(stage: string | null): string[] {
  if (!stage) return [];
  if (stage.startsWith("primary")) return ["primary_4", "primary_5", "primary_6"];
  if (stage.startsWith("prep")) return ["prep_1", "prep_2", "prep_3"];
  if (stage.startsWith("sec")) return ["sec_1", "sec_2", "sec_3"];
  return [];
}

export default async function LeaderboardPage() {
  const session = await getSession({ preferStudent: true });

  if (!session) {
    redirect("/login?callbackUrl=/leaderboard");
  }

  // Fetch current user first to get educationalStage
  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, points: true, pointsUpdatedAt: true, educationalStage: true }
  });

  const competitionTier = getCompetitionTier(currentUser?.educationalStage ?? null);

  // Get Top 10 students for the same educational stage tier
  const topStudents = await prisma.user.findMany({
    where: { 
      role: "student",
      points: { gt: 0 },
      ...(competitionTier.length > 0 ? { educationalStage: { in: competitionTier } } : {})
    },
    orderBy: [
      { points: "desc" },
      { pointsUpdatedAt: "asc" } // Tie-breaker: earliest achievement time
    ],
    take: 10,
    select: {
      id: true,
      name: true,
      points: true,
      educationalStage: true,
    }
  });

  // Find the logged-in student's rank
  let currentRank = 0;
  if (currentUser) {
    const studentsAhead = await prisma.user.count({
      where: {
        role: "student",
        ...(competitionTier.length > 0 ? { educationalStage: { in: competitionTier } } : {}),
        OR: [
          { points: { gt: currentUser.points } },
          { 
            points: currentUser.points,
            pointsUpdatedAt: { lt: currentUser.pointsUpdatedAt }
          }
        ]
      }
    });
    currentRank = studentsAhead + 1;
  }

  // Find today's daily exam for the student's grade
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const dailyExam = currentUser?.educationalStage ? await prisma.dailyExam.findFirst({
    where: {
      educationalStage: currentUser.educationalStage,
      isActive: true,
      date: {
        gte: todayStart,
        lt: todayEnd
      }
    },
    include: {
      results: {
        where: { studentId: session.id }
      }
    }
  }) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors">
      <Navbar user={{ name: session.name, role: session.role }} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-4 flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            لوحة الشرف والمنافسة
            <Trophy className="w-10 h-10 text-yellow-500" />
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">تنافس مع زملائك، احصد النقاط، واربح جوائز قيمة!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Leaderboard Column */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-800 dark:bg-slate-950 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  أفضل 10 طلاب
                </h2>
                {currentUser && (
                  <div className="text-sm bg-slate-700 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-600 dark:border-slate-700">
                    ترتيبك الحالي: <span className="font-bold text-yellow-400">{currentRank}</span>
                  </div>
                )}
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {topStudents.length > 0 ? topStudents.map((student, index) => {
                  const isTop3 = index < 3;
                  const rankColors = [
                    "bg-yellow-100 border-yellow-300 text-yellow-700", // Gold
                    "bg-slate-100 border-slate-300 text-slate-700", // Silver
                    "bg-orange-100 border-orange-300 text-orange-700", // Bronze
                  ];
                  
                  return (
                    <div 
                      key={student.id} 
                      className={`flex items-center p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${student.id === session.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 mr-4 ${isTop3 ? rankColors[index] : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold text-lg ${student.id === session.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                          {student.name} {student.id === session.id && "(أنت)"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{student.educationalStage || 'غير محدد'}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center gap-1.5">
                          <span className="font-black text-slate-700 dark:text-slate-200">{student.points}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">نقطة</span>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    لا يوجد طلاب في لوحة الشرف حتى الآن. كن أول من يحصل على نقاط!
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Prizes System */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-md text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Gift className="w-32 h-32" />
              </div>
              <div className="p-6 relative z-10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-300" />
                  نظام الجوائز
                </h2>
                
                <div className="space-y-3">
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Medal className="w-5 h-5 text-yellow-400" />
                      <span className="font-bold">المركز الأول</span>
                    </div>
                    <p className="text-sm text-blue-100 text-right pr-7">حقيبة ظهر + سماعات + تيشرت المنصة</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Medal className="w-5 h-5 text-slate-300" />
                      <span className="font-bold">المركز الثاني</span>
                    </div>
                    <p className="text-sm text-blue-100 text-right pr-7">باور بانك + تيشرت المنصة</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Medal className="w-5 h-5 text-orange-400" />
                      <span className="font-bold">المركز الثالث</span>
                    </div>
                    <p className="text-sm text-blue-100 text-right pr-7">مج حراري + تيشرت المنصة</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 flex items-center justify-center font-bold text-xs bg-white/20 rounded-full">4-10</span>
                      <span className="font-bold">المركز 4 إلى 10</span>
                    </div>
                    <p className="text-sm text-blue-100 text-right pr-7">تيشرت المنصة</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Exam Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-amber-500 dark:bg-amber-600 p-4 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  التحدي اليومي
                </h2>
              </div>
              <div className="p-6">
                {dailyExam ? (
                  dailyExam.results.length > 0 ? (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-8 h-8 fill-emerald-600 dark:fill-emerald-400" />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">أكملت التحدي بنجاح!</h3>
                      <p className="text-slate-600 dark:text-slate-300 mb-4">حصلت على {dailyExam.results[0].score} من {dailyExam.results[0].totalQ} إجابة صحيحة</p>
                      <button disabled className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-bold rounded-xl cursor-not-allowed">
                        عد غداً لتحدي جديد
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">{dailyExam.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-6">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {dailyExam.timeLimitMinutes} دقيقة
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4" /> نقاط إضافية
                        </span>
                      </div>
                      <Link 
                        href={`/leaderboard/daily-exam/${dailyExam.id}`}
                        className="w-full flex items-center justify-center py-3 bg-amber-500 dark:bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-600 dark:hover:bg-amber-500 transition shadow-md"
                      >
                        ابدأ التحدي الآن
                      </Link>
                    </div>
                  )
                ) : (
                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                    <Target className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p>لا يوجد تحدي متاح لصفك التدريبي اليوم.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
