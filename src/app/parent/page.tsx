import { redirect } from "next/navigation";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PrintButton } from "@/components/ui/PrintButton";
import { 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  AlertTriangle, 
  MessageSquare, 
  Bell, 
  Download,
  Calendar,
  Award
} from "lucide-react";

export default async function ParentDashboardPage() {
  const session = await getSession({ preferStudent: true });

  if (!session) {
    redirect("/login?callbackUrl=/parent");
  }

  // Fetch student data for the parent dashboard
  const student = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      quizResults: {
        include: { quiz: true },
        orderBy: { completedAt: "desc" },
        take: 5
      },
      aiInsights: {
        where: { type: "weak_area" },
        orderBy: { createdAt: "desc" },
        take: 3
      },
      accessCodes: {
        where: { isActive: true },
        include: { course: true }
      },
      feedbacks: {
        where: { type: "teacher_issue" },
        orderBy: { createdAt: "desc" },
        take: 3
      }
    }
  });

  if (!student) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-orange-50/30 flex flex-col font-sans">
      <div className="print:hidden">
        <Navbar user={{ name: session.name, role: session.role }} />
      </div>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">بوابة ولي الأمر</h1>
            <p className="text-slate-600 mt-1">متابعة الأداء الأكاديمي للطالب: <span className="font-semibold text-orange-600">{student.name}</span></p>
          </div>
          <PrintButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Quick Stats Cards */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">النقاط الأكاديمية</p>
              <h3 className="text-2xl font-bold text-slate-800">{student.points} نقطة</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">أيام الحضور المتتالية</p>
              <h3 className="text-2xl font-bold text-slate-800">{student.loginStreak} أيام</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">الكورسات المسجلة</p>
              <h3 className="text-2xl font-bold text-slate-800">{student.accessCodes.length} كورسات</h3>
            </div>
          </div>

          {/* Main Content Columns */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Academic Performance */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                الأداء الأكاديمي الأخير
              </h2>
              {student.quizResults.length > 0 ? (
                <div className="space-y-4">
                  {student.quizResults.map((result) => {
                    const percentage = Math.round((result.score / result.totalQ) * 100);
                    return (
                      <div key={result.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{result.quiz.title}</span>
                          <span className={percentage >= 80 ? "text-emerald-600 font-bold" : percentage >= 50 ? "text-amber-600 font-bold" : "text-red-600 font-bold"}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">لم يقم الطالب بأي اختبارات بعد.</p>
              )}
            </section>

            {/* Enrolled Courses */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                الكورسات المسجلة
              </h2>
              {student.accessCodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {student.accessCodes.map(ac => (
                    <div key={ac.id} className="border border-slate-100 p-4 rounded-lg bg-slate-50">
                      <p className="font-medium text-slate-800">{ac.course.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{ac.course.subject} - {ac.course.educationalStage}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">لا يوجد كورسات مسجلة.</p>
              )}
            </section>

          </div>

          <div className="space-y-6">
            
            {/* Weak Points Report */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                نقاط الضعف (تحليل الذكاء الاصطناعي)
              </h2>
              {student.aiInsights.length > 0 ? (
                <div className="space-y-4">
                  {student.aiInsights.map(insight => (
                    <div key={insight.id} className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <p className="text-sm font-semibold text-red-800">{insight.title}</p>
                      <p className="text-xs text-red-600 mt-1">{insight.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-500 mb-2">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-emerald-700 font-medium">أداء الطالب ممتاز! لا توجد نقاط ضعف ملحوظة.</p>
                </div>
              )}
            </section>

            {/* Complaints and Messages */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                الشكاوى والرسائل
              </h2>
              {student.feedbacks.length > 0 ? (
                <div className="space-y-3">
                  {student.feedbacks.map(fb => (
                    <div key={fb.id} className="text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-slate-700 truncate">{fb.content.substring(0, 40)}...</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${fb.isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {fb.isResolved ? "تم الحل" : "قيد المراجعة"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(fb.createdAt).toLocaleDateString('ar-EG')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">لا توجد شكاوى مسجلة.</p>
              )}
            </section>

          </div>

        </div>
      </main>
      
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
