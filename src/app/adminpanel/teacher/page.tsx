"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { DarkModeToggle } from "@/components/ui/DarkModeToggle";
import { useToast } from "@/components/ui/Toast";
import { TeacherRequests } from "@/components/admin/TeacherRequests";
import { TeacherFeedback } from "@/components/admin/TeacherFeedback";
import { TeacherQuizResults } from "@/components/admin/TeacherQuizResults";
import { EDUCATIONAL_STAGES, SUBJECTS } from "@/types";

async function readJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

interface Course {
  id: string;
  title: string;
  subject?: string;
  description?: string;
  thumbnailUrl?: string;
  educationalStage?: string;
  maxWatchCount?: number | null;
  homeworkUrl?: string | null;
  folders?: Folder[];
  _count?: { accessCodes?: number };
  isPaid?: boolean;
  price?: number | null;
  discountPercent?: number | null;
  discountExpiresAt?: string | null;
}

interface Folder {
  id: string;
  name: string;
  videos?: Array<{ id: string; title: string; bunnyId?: string }>;
  quizzes?: Array<{ id: string }>;
  _count?: { videos?: number; quizzes?: number };
}

interface AccessCode {
  id: string;
  code: string;
  courseId: string;
  isActive?: boolean;
  student?: { id: string; name: string; email?: string } | null;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCourse, setCreatingCourse] = useState(false);
  // Forms
  const [newCourse, setNewCourse] = useState({
    title: "", subject: "", description: "", thumbnailUrl: "", educationalStage: "",
  });
  const [newFolder, setNewFolder] = useState("");
  const [newVideo, setNewVideo] = useState({ title: "", bunnyId: "", folderId: "" });
  const [newQuiz, setNewQuiz] = useState({
    title: "", folderId: "",
    timeLimitMinutes: 30,
    questions: [{ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" }],
  });
  const [courseSettings, setCourseSettings] = useState({
    title: "",
    subject: "",
    description: "",
    thumbnailUrl: "",
    educationalStage: "",
    maxWatchCount: 3,
    homeworkUrl: "",
  });
  const [pricingSettings, setPricingSettings] = useState({
    isPaid: false,
    price: "",
    discountPercent: "",
    discountExpiresAt: "",
  });
  const [savingPricing, setSavingPricing] = useState(false);

  const notify = (type: "success" | "error", text: string) => {
    if (type === "success") toastSuccess(text);
    else toastError(text);
  };

  const updateStudentAccess = async (studentId: string, action: "ban" | "unban") => {
    if (!selectedCourse) return;
    const res = await fetch("/api/admin/students", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, courseId: selectedCourse.id, action }),
    });
    const data = await readJson<{ error?: string; message?: string }>(res);
    if (res.ok) {
      fetchCodes(selectedCourse.id);
      notify("success", data?.message || (action === "ban" ? "تم حظر الطالب بنجاح" : "تم إلغاء حظر الطالب"));
    } else {
      notify("error", data?.error || "تعذر تحديث حالة الطالب");
    }
  };

  const fetchCourses = useCallback(async () => {
    const res = await fetch("/api/admin/courses", { credentials: "include" });
    if (res.status === 403) { router.push("/adminpanel"); return; }
    const data = await readJson<{ courses?: Course[] }>(res);
    setCourses(data?.courses || []);
    setLoading(false);
  }, [router]);

  const fetchFolders = async (courseId: string) => {
    const res = await fetch(`/api/admin/courses/${courseId}/folders`, { credentials: "include" });
    const data = await readJson<{ folders?: Folder[] }>(res);
    setFolders(data?.folders || []);
  };

  const fetchCodes = async (courseId: string) => {
    const res = await fetch(`/api/admin/codes?courseId=${courseId}`, { credentials: "include" });
    const data = await readJson<{ codes?: AccessCode[] }>(res);
    setCodes(data?.codes || []);
  };

  useEffect(() => {
    const loadCourses = async () => {
      try {
          const res = await fetch("/api/admin/courses", { credentials: "include" });
        if (res.status === 403) { router.push("/adminpanel"); return; }

        const data = await readJson<{ courses?: Course[] }>(res);
        setCourses(data?.courses || []);
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    void loadCourses();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/adminpanel");
  };

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: newCourse.title.trim(),
      subject: newCourse.subject.trim(),
      description: newCourse.description.trim(),
      thumbnailUrl: newCourse.thumbnailUrl.trim(),
      educationalStage: newCourse.educationalStage.trim(),
    };

    if (!payload.title || !payload.subject || !payload.educationalStage) {
      notify("error", "العنوان والمادة والمرحلة مطلوبة");
      return;
    }

    setCreatingCourse(true);
    try {
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      const data = await readJson<{ error?: string }>(res);

      if (res.ok) {
        notify("success", "✅ تم إنشاء الكورس بنجاح");
        setNewCourse({ title: "", subject: "", description: "", thumbnailUrl: "", educationalStage: "" });
        await fetchCourses();
      setActiveSection("courses");
      } else {
        notify("error", data?.error || "تعذر إنشاء الكورس");
      }
    } catch {
      notify("error", "تعذر إنشاء الكورس الآن");
    } finally {
      setCreatingCourse(false);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكورس؟")) return;
      const res = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE", credentials: "include" });
      const data = await readJson<{ error?: string }>(res);
      if (res.ok) {
        notify("success", "✅ تم حذف الكورس بنجاح");
        fetchCourses();
      } else {
        notify("error", data?.error || "تعذر حذف الكورس");
      }
    if (selectedCourse?.id === courseId) setSelectedCourse(null);
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newFolder.trim()) return;
    const res = await fetch(`/api/admin/courses/${selectedCourse.id}/folders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolder }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      setNewFolder("");
      if (selectedCourse) fetchFolders(selectedCourse.id);
      notify("success", "✅ تم إضافة المحاضرة بنجاح");
    } else {
      notify("error", data?.error || "تعذر إضافة المحاضرة");
    }
  };

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.folderId) return;
    const res = await fetch(`/api/admin/folders/${newVideo.folderId}/videos`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newVideo.title, bunnyId: newVideo.bunnyId }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      setNewVideo({ title: "", bunnyId: "", folderId: "" });
      if (selectedCourse) fetchFolders(selectedCourse.id);
      notify("success", "✅ تم إضافة الفيديو بنجاح");
    } else {
      notify("error", data?.error || "تعذر إضافة الفيديو");
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفيديو؟")) return;
    if (!selectedCourse) return;
    const res = await fetch(`/api/admin/courses/${selectedCourse.id}/videos`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      if (selectedCourse) fetchFolders(selectedCourse.id);
      notify("success", "✅ تم حذف الفيديو بنجاح");
    } else {
      notify("error", data?.error || "تعذر حذف الفيديو");
    }
  };

  const addQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuiz.folderId) return;
    const res = await fetch(`/api/admin/folders/${newQuiz.folderId}/quizzes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newQuiz.title, questions: newQuiz.questions, timeLimitMinutes: newQuiz.timeLimitMinutes }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      setNewQuiz({ title: "", folderId: "", timeLimitMinutes: 30, questions: [{ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" }] });
      if (selectedCourse) fetchFolders(selectedCourse.id);
      notify("success", "✅ تم إضافة الاختبار بنجاح");
    } else {
      notify("error", data?.error || "تعذر إضافة الاختبار");
    }
  };

  const generateCodes = async (courseId: string, count: number) => {
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, count }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      fetchCodes(courseId);
      notify("success", `✅ تم إنشاء ${count} كود بنجاح`);
    } else {
      notify("error", data?.error || "تعذر إنشاء الأكواد");
    }
  };

  const toggleCode = async (codeId: string, isActive: boolean) => {
    const res = await fetch("/api/admin/codes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codeId, isActive }),
    });
    const data = await readJson<{ error?: string }>(res);
    if (res.ok) {
      if (selectedCourse) fetchCodes(selectedCourse.id);
      notify("success", isActive ? "✅ تم تفعيل الكود" : "✅ تم تعطيل الكود");
    } else {
      notify("error", data?.error || "تعذر تحديث الكود");
    }
  };

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseSettings({
      title: course.title,
      subject: course.subject || "",
      description: course.description || "",
      thumbnailUrl: course.thumbnailUrl || "",
      educationalStage: course.educationalStage || "",
      maxWatchCount: course.maxWatchCount ?? 3,
      homeworkUrl: course.homeworkUrl || "",
    });
    setPricingSettings({
      isPaid: course.isPaid ?? false,
      price: course.price != null ? String(course.price) : "",
      discountPercent: course.discountPercent != null ? String(course.discountPercent) : "",
      discountExpiresAt: course.discountExpiresAt
        ? new Date(course.discountExpiresAt).toISOString().slice(0, 16)
        : "",
    });
    fetchFolders(course.id);
    fetchCodes(course.id);
    setActiveSection("courses");
  };

  const savePricingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setSavingPricing(true);
        const res = await fetch(`/api/admin/courses/${selectedCourse.id}/pricing`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isPaid: pricingSettings.isPaid,
            price: pricingSettings.price ? parseFloat(pricingSettings.price) : null,
            discountPercent: pricingSettings.discountPercent ? parseFloat(pricingSettings.discountPercent) : null,
            discountExpiresAt: pricingSettings.discountExpiresAt || null,
          }),
        });
    const data = await readJson<{ error?: string }>(res);
    setSavingPricing(false);
    if (res.ok) {
      notify("success", "✅ تم حفظ إعدادات التسعير");
      fetchCourses();
    } else {
      notify("error", data?.error || "تعذر حفظ إعدادات التسعير");
    }
  };

  const saveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    const res = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...courseSettings,
        homeworkUrl: courseSettings.homeworkUrl || null,
        maxWatchCount: courseSettings.maxWatchCount,
      }),
    });
    const data = await readJson<{ course?: Course; error?: string }>(res);

    if (res.ok) {
      notify("success", "✅ تم حفظ إعدادات الكورس");
      setSelectedCourse((current) => (current && data?.course ? { ...current, ...data.course } : current));
      fetchCourses();
    } else {
      notify("error", data?.error || "تعذر حفظ إعدادات الكورس");
    }
  };

  const totalStudents = courses.reduce((a: number, c: Course) => a + (c._count?.accessCodes || 0), 0);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar role="teacher" activeSection={activeSection} setActiveSection={setActiveSection} onLogout={handleLogout} />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            {activeSection === "dashboard" && "لوحة التحكم"}
            {activeSection === "courses" && (selectedCourse ? `📚 ${selectedCourse.title}` : "الكورسات")}
            {activeSection === "quiz-results" && "نتائج الاختبارات"}
            {activeSection === "create-course" && "كورس جديد"}
            {activeSection === "codes" && "أكواد الوصول"}
            {activeSection === "students" && "الطلاب"}
            {activeSection === "requests" && "طلبات الطلاب"}
            {activeSection === "feedback" && "ملاحظات الطلاب"}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
              👨‍🏫 مدرس
            </span>
            <DarkModeToggle />
          </div>
        </div>

        <div className="p-6">
          {/* DASHBOARD */}
          {activeSection === "dashboard" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: "الكورسات", value: courses.length, icon: "📚", color: "text-blue-400" },
                  { label: "الطلاب", value: totalStudents, icon: "👨‍🎓", color: "text-green-400" },
                  { label: "إجمالي الفيديوهات", value: courses.reduce((a: number, c: Course) => a + (c.folders?.reduce((b: number, f: Folder) => b + (f._count?.videos || 0), 0) || 0), 0), icon: "🎬", color: "text-purple-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                    <div className="text-gray-400 text-sm mt-1">{s.icon} {s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h2 className="font-bold">كورساتي</h2>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-gray-500">جارٍ التحميل...</div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {courses.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-750 cursor-pointer" onClick={() => selectCourse(c)}>
                        <div>
                          <p className="font-medium">{c.title}</p>
                          <p className="text-xs text-gray-400">{c.subject} • {c._count?.accessCodes || 0} طالب</p>
                        </div>
                        <span className="text-blue-400 text-sm">←</span>
                      </div>
                    ))}
                    {courses.length === 0 && (
                      <div className="p-8 text-center text-gray-500">لا توجد كورسات بعد</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* COURSES MANAGEMENT */}
          {activeSection === "courses" && (
            <>
              {!selectedCourse ? (
                <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700 flex justify-between">
                    <h2 className="font-bold">كورساتي ({courses.length})</h2>
                    <button onClick={() => setActiveSection("create-course")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm rounded-lg">
                      + كورس جديد
                    </button>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {courses.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => selectCourse(c)}>
                          {c.thumbnailUrl ? (
                            <Image
                              src={c.thumbnailUrl}
                              alt={c.title}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-xl object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-xl">📚</div>
                          )}
                          <div>
                            <p className="font-medium">{c.title}</p>
                            <p className="text-xs text-gray-400">{c.subject} • {c._count?.accessCodes || 0} طالب • {c.folders?.length || 0} محاضرة</p>
                          </div>
                        </div>
                        <button onClick={() => deleteCourse(c.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                          🗑️
                        </button>
                      </div>
                    ))}
                    {courses.length === 0 && <div className="p-8 text-center text-gray-500">لا توجد كورسات</div>}
                  </div>
                </div>
              ) : (
                /* Selected course detail */
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-white">← رجوع</button>
                  </div>

                  {/* Folders & Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 lg:col-span-2">
                      <h3 className="font-bold mb-4">⚙️ إعدادات الكورس</h3>
                      <form onSubmit={saveCourseSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={courseSettings.title}
                          onChange={(e) => setCourseSettings({ ...courseSettings, title: e.target.value })}
                          placeholder="عنوان الكورس"
                          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={courseSettings.subject}
                          onChange={(e) => setCourseSettings({ ...courseSettings, subject: e.target.value })}
                          placeholder="المادة"
                          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={courseSettings.educationalStage}
                          onChange={(e) => setCourseSettings({ ...courseSettings, educationalStage: e.target.value })}
                          placeholder="المرحلة الدراسية"
                          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="md:col-span-2">
                          <input
                            type="url"
                            value={courseSettings.thumbnailUrl}
                            onChange={(e) => setCourseSettings({ ...courseSettings, thumbnailUrl: e.target.value })}
                            placeholder="رابط الصورة المصغرة"
                            className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-400">الأبعاد المثالية: 800×400 بكسل (نسبة 2:1 أفقية)</p>
                        </div>
                        <textarea
                          rows={3}
                          value={courseSettings.description}
                          onChange={(e) => setCourseSettings({ ...courseSettings, description: e.target.value })}
                          placeholder="وصف الكورس"
                          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none md:col-span-2"
                        />
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={courseSettings.maxWatchCount}
                          onChange={(e) => setCourseSettings({ ...courseSettings, maxWatchCount: Number(e.target.value) || 3 })}
                          placeholder="عدد المشاهدات المسموح بها لكل طالب"
                          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 md:col-span-2"
                          dir="ltr"
                        />
                        <input
                          type="url"
                          value={courseSettings.homeworkUrl}
                          onChange={(e) => setCourseSettings({ ...courseSettings, homeworkUrl: e.target.value })}
                          placeholder="رابط صفحة الواجب المنزلي"
                          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 md:col-span-2"
                          dir="ltr"
                        />
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm rounded-lg md:col-span-2">
                          حفظ الإعدادات
                        </button>
                      </form>
                    </div>

                    {/* Pricing Settings */}
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 lg:col-span-2">
                      <h3 className="font-bold mb-4">💰 تسعير الكورس</h3>
                      <form onSubmit={savePricingSettings} className="space-y-4">
                        {/* Free / Paid toggle */}
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setPricingSettings({ ...pricingSettings, isPaid: false })}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                              !pricingSettings.isPaid
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : "bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500"
                            }`}
                          >
                            مجاني
                          </button>
                          <button
                            type="button"
                            onClick={() => setPricingSettings({ ...pricingSettings, isPaid: true })}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                              pricingSettings.isPaid
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500"
                            }`}
                          >
                            مدفوع
                          </button>
                        </div>

                        {pricingSettings.isPaid && (
                          <div className="space-y-3 border border-blue-900/40 bg-blue-950/20 rounded-xl p-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">السعر الأصلي (جنيه) *</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={pricingSettings.price}
                                onChange={(e) => setPricingSettings({ ...pricingSettings, price: e.target.value })}
                                placeholder="مثال: 150"
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        )}

                        {/* Discount section */}
                        <div className="border border-orange-900/30 bg-orange-950/10 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-bold text-orange-400 uppercase tracking-wide">خصم محدود المدة (اختياري)</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">نسبة الخصم %</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={pricingSettings.discountPercent}
                                onChange={(e) => setPricingSettings({ ...pricingSettings, discountPercent: e.target.value })}
                                placeholder="مثال: 20"
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                dir="ltr"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">تاريخ انتهاء العرض</label>
                              <input
                                type="datetime-local"
                                value={pricingSettings.discountExpiresAt}
                                onChange={(e) => setPricingSettings({ ...pricingSettings, discountExpiresAt: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                dir="ltr"
                              />
                            </div>
                          </div>
                          {pricingSettings.discountPercent && pricingSettings.isPaid && pricingSettings.price && (
                            <p className="text-xs text-orange-300">
                              السعر بعد الخصم: <strong>{(parseFloat(pricingSettings.price) * (1 - parseFloat(pricingSettings.discountPercent) / 100)).toFixed(2)} جنيه</strong>
                            </p>
                          )}
                          {pricingSettings.discountPercent && !pricingSettings.isPaid && (
                            <p className="text-xs text-orange-300">الخصم يُطبق فقط على الكورسات المدفوعة.</p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={savingPricing}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-bold rounded-xl transition-colors"
                        >
                          {savingPricing ? "جارٍ الحفظ..." : "حفظ إعدادات التسعير"}
                        </button>
                      </form>
                    </div>

                  {/* Add Folder */}
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                      <h3 className="font-bold mb-4">📁 إضافة محاضرة</h3>
                      <form onSubmit={createFolder} className="flex gap-2">
                        <input
                          type="text"
                          value={newFolder}
                          onChange={(e) => setNewFolder(e.target.value)}
                          placeholder="مثال: المحاضرة الأولى"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm rounded-lg">إضافة</button>
                      </form>

                      {/* Folders list */}
                      <div className="mt-4 space-y-3">
                        {folders.map((f) => (
                          <div key={f.id} className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                            <p className="font-medium text-sm mb-2">📁 {f.name}</p>
                            <div className="text-xs text-gray-400 flex gap-4">
                              <span>🎬 {f.videos?.length || 0} فيديو</span>
                              <span>📝 {f.quizzes?.length || 0} اختبار</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {f.videos?.map((video) => (
                                <div key={video.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-sm text-white truncate">🎬 {video.title}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => deleteVideo(video.id)}
                                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-red-300 hover:text-white hover:bg-red-500/20 transition-colors"
                                  >
                                    حذف
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Video */}
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                      <h3 className="font-bold mb-4">🎬 إضافة فيديو (Bunny CDN)</h3>
                      <form onSubmit={addVideo} className="space-y-3">
                        <select
                          value={newVideo.folderId}
                          onChange={(e) => setNewVideo({ ...newVideo, folderId: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">اختر المحاضرة</option>
                          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <input
                          type="text"
                          value={newVideo.title}
                          onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                          placeholder="عنوان الفيديو"
                          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={newVideo.bunnyId}
                          onChange={(e) => setNewVideo({ ...newVideo, bunnyId: e.target.value })}
                          placeholder="Bunny Video ID"
                          dir="ltr"
                          className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                        <button type="submit" disabled={!newVideo.folderId || !newVideo.title || !newVideo.bunnyId} className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm rounded-lg">
                          إضافة الفيديو
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Add Quiz */}
                  <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                    <h3 className="font-bold mb-4">📝 إضافة اختبار</h3>
                    <form onSubmit={addQuiz} className="space-y-4">
                      <div className="flex gap-3">
                        <select
                          value={newQuiz.folderId}
                          onChange={(e) => setNewQuiz({ ...newQuiz, folderId: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">اختر المحاضرة</option>
                          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <input
                          type="text"
                          value={newQuiz.title}
                          onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                          placeholder="عنوان الاختبار"
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min={1}
                          max={240}
                          value={newQuiz.timeLimitMinutes}
                          onChange={(e) => setNewQuiz({ ...newQuiz, timeLimitMinutes: Number(e.target.value) || 30 })}
                          placeholder="الوقت بالدقائق"
                          className="w-44 px-3 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Questions */}
                      {newQuiz.questions.map((q, qi) => (
                        <div key={qi} className="bg-gray-900 rounded-xl p-4 border border-gray-700 space-y-3">
                          <p className="text-sm font-medium text-gray-300">السؤال {qi + 1}</p>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const qs = [...newQuiz.questions];
                              qs[qi].question = e.target.value;
                              setNewQuiz({ ...newQuiz, questions: qs });
                            }}
                            placeholder="نص السؤال"
                            className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {(["A", "B", "C", "D"] as const).map((opt) => (
                              <div key={opt} className="flex gap-2 items-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${q.correctAnswer === opt ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"}`}>{opt}</span>
                                <input
                                  type="text"
                                  value={q[`option${opt}` as keyof typeof q] as string}
                                  onChange={(e) => {
                                    const qs = [...newQuiz.questions];
                                    (qs[qi] as { optionA?: string; optionB?: string; optionC?: string; optionD?: string; question?: string; correctAnswer?: string })[`option${opt}`] = e.target.value;
                                    setNewQuiz({ ...newQuiz, questions: qs });
                                  }}
                                  placeholder={`الخيار ${opt}`}
                                  className="flex-1 px-2 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">الإجابة الصحيحة:</span>
                            {(["A", "B", "C", "D"] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const qs = [...newQuiz.questions];
                                  qs[qi].correctAnswer = opt;
                                  setNewQuiz({ ...newQuiz, questions: qs });
                                }}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                  q.correctAnswer === opt ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setNewQuiz({
                            ...newQuiz,
                            questions: [...newQuiz.questions, { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" }],
                          })}
                          className="px-4 py-2 border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
                        >
                          + سؤال جديد
                        </button>
                        <button
                          type="submit"
                          disabled={!newQuiz.folderId || !newQuiz.title}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm rounded-lg"
                        >
                          إضافة الاختبار
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CREATE COURSE */}
          {activeSection === "create-course" && (
            <div className="max-w-2xl">
              <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.3em] text-blue-400/80 mb-2">Course Builder</p>
                <h2 className="text-2xl font-black mb-2">إنشاء كورس جديد</h2>
                <p className="text-sm text-gray-400 max-w-xl leading-7">
                  املأ بيانات الكورس مرة واحدة وسيظهر مباشرة في لوحة المدرس والواجهة العامة.
                </p>
              </div>
              <form onSubmit={createCourse} className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-6 md:p-8 border border-white/10 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.8)] space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">عنوان الكورس *</label>
                  <input type="text" required value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    placeholder="رياضيات ثالث ثانوي" className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">المادة *</label>
                  <select required value={newCourse.subject} onChange={(e) => setNewCourse({ ...newCourse, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">اختر المادة</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">المرحلة الدراسية *</label>
                  <select required value={newCourse.educationalStage} onChange={(e) => setNewCourse({ ...newCourse, educationalStage: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">اختر المرحلة</option>
                    {EDUCATIONAL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">رابط الصورة المصغرة</label>
                  <input type="url" value={newCourse.thumbnailUrl} onChange={(e) => setNewCourse({ ...newCourse, thumbnailUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg" dir="ltr"
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="mt-1 text-xs text-gray-400">الأبعاد المثالية: 800×400 بكسل (نسبة 2:1 أفقية)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">وصف الكورس</label>
                  <textarea rows={3} value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    placeholder="وصف مختصر للكورس..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">رقم واتسآب لبيع الأكواد <span className="text-gray-500 font-normal">(مدفوع فقط)</span></label>
                  <input type="tel" value={newCourse.contactPhone} onChange={(e) => setNewCourse({ ...newCourse, contactPhone: e.target.value })}
                    placeholder="مثال: 01012345678" dir="ltr"
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <button type="submit" disabled={creatingCourse} className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 hover:opacity-95 disabled:opacity-60 text-white font-semibold rounded-xl transition-opacity shadow-lg shadow-blue-900/30">
                  {creatingCourse ? "جارٍ إنشاء الكورس..." : "إنشاء الكورس"}
                </button>
              </form>
            </div>
          )}

          {/* CODES MANAGEMENT */}
          {activeSection === "codes" && (
            <>
              {!selectedCourse ? (
                <div>
                  <p className="text-gray-400 mb-4">اختر كورساً لإدارة أكواده:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {courses.map((c) => (
                      <div key={c.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700 cursor-pointer hover:border-blue-600 transition-colors" onClick={() => selectCourse(c)}>
                        <p className="font-bold">{c.title}</p>
                        <p className="text-sm text-gray-400">{c._count?.accessCodes || 0} كود</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-white">← رجوع</button>
                    <h2 className="font-bold">{selectedCourse.title} - الأكواد</h2>
                    <div className="mr-auto flex gap-2">
                      {[1, 5, 10].map((n) => (
                        <button key={n} onClick={() => generateCodes(selectedCourse.id, n)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm rounded-lg transition-colors">
                          + {n} {n === 1 ? "كود" : "أكواد"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-gray-900 text-xs text-gray-400 border-b border-gray-700 font-medium">
                      <span>الكود</span>
                      <span>الطالب</span>
                      <span>الحالة</span>
                      <span>إجراء</span>
                    </div>
                    {codes.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">لا توجد أكواد بعد</div>
                    ) : (
                      <div className="divide-y divide-gray-700">
                        {codes.map((c) => (
                          <div key={c.id} className="grid grid-cols-4 gap-4 p-3 items-center text-sm">
                            <span className="font-mono text-blue-400 text-xs">{c.code}</span>
                            <span className="text-gray-300 truncate">{c.student?.name || "—"}</span>
                            <span className={`inline-flex items-center gap-1 text-xs ${!c.student ? (c.isActive ? "text-green-400" : "text-gray-400") : c.isActive ? "text-green-400" : "text-red-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${!c.student ? (c.isActive ? "bg-green-400" : "bg-gray-400") : c.isActive ? "bg-green-400" : "bg-red-400"}`} />
                              {!c.student ? (c.isActive ? "متاح" : "معطل") : c.isActive ? "مسجل" : "محظور"}
                            </span>
                            <button
                              onClick={() => toggleCode(c.id, !c.isActive)}
                              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                c.isActive ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" : "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                              }`}
                            >
                              {c.isActive ? "تعطيل" : "تفعيل"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STUDENTS */}
          {activeSection === "students" && (
            <div>
              <p className="text-gray-400 mb-4">اختر كورساً لعرض طلابه:</p>
              {!selectedCourse ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.map((c) => (
                    <div key={c.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700 cursor-pointer hover:border-blue-600 transition-colors" onClick={() => selectCourse(c)}>
                      <p className="font-bold">{c.title}</p>
                      <p className="text-sm text-gray-400">{c._count?.accessCodes || 0} طالب مسجل</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-white">← رجوع</button>
                    <h2 className="font-bold">{selectedCourse.title} - الطلاب</h2>
                  </div>
                  <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                    <div className="divide-y divide-gray-700">
                      {codes.filter((c) => c.student).map((c) => (
                        <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                              {c.student!.name[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{c.student!.name}</p>
                              <p className="text-xs text-gray-400 truncate">{c.student!.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full ${c.isActive ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                              {c.isActive ? "نشط" : "محظور"}
                            </span>
                            {c.isActive ? (
                              <button
                                type="button"
                                onClick={() => updateStudentAccess(c.student!.id, "ban")}
                                className="px-2 py-1 text-xs rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50"
                              >
                                حظر
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateStudentAccess(c.student!.id, "unban")}
                                className="px-2 py-1 text-xs rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50"
                              >
                                إلغاء الحظر
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {codes.filter((c) => c.student).length === 0 && (
                        <div className="p-8 text-center text-gray-500">لا يوجد طلاب مسجلون بعد</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QUIZ RESULTS — view scores + allow retakes */}
          {activeSection === "quiz-results" && <TeacherQuizResults />}

          {/* REQUESTS — grade adjustments + tickets */}
          {activeSection === "requests" && <TeacherRequests />}

          {/* FEEDBACK — student feedback about teacher/courses */}
          {activeSection === "feedback" && <TeacherFeedback />}
        </div>
      </div>
    </div>
  );
}
