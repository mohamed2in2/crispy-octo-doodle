"use client";
import { useState, useEffect } from "react";
import { EDUCATIONAL_STAGES } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { hasPermission } from "@/lib/rbac";

interface CourseInfo {
  id: string;
  title: string;
  subject: string;
  educationalStage: string;
  teacher: { id: string; name: string };
}

interface AccessCodeEntry {
  id: string;
  isActive: boolean;
  usedAt: string | null;
  course: CourseInfo;
}

interface StudentDetail {
  id: string;
  name: string;
  email: string;
  age: number | null;
  phone: string | null;
  parentPhone: string | null;
  educationalStage: string | null;
  isActive: boolean;
  profileCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  accessCodes: AccessCodeEntry[];
}

interface QuizResultEntry {
  id: string;
  score: number;
  totalQ: number;
  completedAt: string;
  quiz: {
    id: string;
    title: string;
    folder: {
      course: { id: string; title: string };
    };
  };
}

interface DetailResponse {
  student: StudentDetail;
  quizResults: QuizResultEntry[];
  watchedCount: number;
  error?: string;
}

interface CourseGroup {
  courseTitle: string;
  results: QuizResultEntry[];
}

function stageLabel(value: string | null) {
  if (!value) return "—";
  return EDUCATIONAL_STAGES.find((s) => s.value === value)?.label ?? value;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function InfoRow({ label, value, mono = false }: InfoRowProps) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className={`text-white text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

type PendingAction = "suspend" | "unsuspend" | "delete" | null;

interface Props {
  studentId: string;
  onClose: () => void;
  userRole?: string;
  /** Called after a successful suspend/unsuspend or delete so the parent can refresh the list */
  onStudentModified?: () => void;
}

export function StudentDetailModal({ studentId, onClose, onStudentModified, userRole = "superadmin" }: Props) {
  const { success: toastSuccess } = useToast();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    fetch(`/api/admin/superadmin/students/${studentId}`, { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json()) as DetailResponse;
        if (!res.ok) {
          setError(json.error ?? "تعذر جلب البيانات");
          return;
        }
        setData(json);
      })
      .catch(() => setError("تعذر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, [studentId]);

  const resultsByCourse = data?.quizResults.reduce<Record<string, CourseGroup>>(
    (acc, r) => {
      const courseId = r.quiz.folder.course.id;
      if (!acc[courseId]) {
        acc[courseId] = { courseTitle: r.quiz.folder.course.title, results: [] };
      }
      acc[courseId].results.push(r);
      return acc;
    },
    {}
  );

  const handleSuspend = async (password: string) => {
    const isActive = pendingAction === "unsuspend";
    const res = await fetch(`/api/admin/superadmin/students/${studentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionPassword: password, isActive }),
    });
    const json = (await res.json()) as { error?: string; isActive?: boolean };
    if (!res.ok) throw new Error(json.error ?? "تعذر تعديل حالة الحساب");
    toastSuccess(isActive ? "تم رفع التعليق عن الحساب بنجاح" : "تم تعليق الحساب بنجاح");
    if (data) setData({ ...data, student: { ...data.student, isActive } });
    setPendingAction(null);
    onStudentModified?.();
  };

  const handleDelete = async (password: string) => {
    const res = await fetch(`/api/admin/superadmin/students/${studentId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionPassword: password }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error ?? "تعذر حذف الطالب");
    toastSuccess("تم حذف حساب الطالب نهائياً");
    setPendingAction(null);
    onStudentModified?.();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700 shrink-0">
          <h2 className="text-white font-bold text-lg">ملف الطالب</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="text-center py-10 text-gray-500">جارٍ التحميل...</div>
          )}
          {error && (
            <div className="text-center py-10 text-red-400">{error}</div>
          )}

          {data && (
            <>
              {/* Profile card */}
              <div className="bg-gray-900/60 rounded-xl p-5 border border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-linear-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0">
                    {data.student.name[0]}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{data.student.name}</h3>
                    <p className="text-gray-400 text-sm">{stageLabel(data.student.educationalStage)}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        data.student.isActive
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {data.student.isActive ? "حساب نشط" : "حساب موقوف"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="السن" value={data.student.age ? `${data.student.age} سنة` : "—"} />
                  <InfoRow label="رقم الطالب" value={data.student.phone ?? "—"} mono />
                  <InfoRow label="رقم ولي الأمر" value={data.student.parentPhone ?? "—"} mono />
                  <InfoRow label="تاريخ التسجيل" value={fmtDate(data.student.createdAt)} />
                  <InfoRow label="آخر دخول" value={fmtDate(data.student.lastLoginAt)} />
                  <InfoRow
                    label="الفيديوهات المشاهدة"
                    value={`${data.watchedCount} فيديو`}
                  />
                </div>

                {/* Action buttons — only shown when the role has write permissions */}
                {(hasPermission(userRole, "suspend_student") || hasPermission(userRole, "soft_delete_student")) && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
                  {data.student.isActive ? (
                    <button
                      onClick={() => setPendingAction("suspend")}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-colors"
                    >
                      ⚠️ تعليق الحساب
                    </button>
                  ) : (
                    <button
                      onClick={() => setPendingAction("unsuspend")}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-colors"
                    >
                      ✅ رفع التعليق
                    </button>
                  )}
                  {hasPermission(userRole, "soft_delete_student") && (
                  <button
                    onClick={() => setPendingAction("delete")}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                  >
                    🗑️ أرشفة الحساب
                  </button>
                  )}
                </div>
                )}
              </div>

              {/* Enrolled courses */}
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">
                  الكورسات المشتركة ({data.student.accessCodes.length})
                </h4>
                {data.student.accessCodes.length === 0 ? (
                  <p className="text-gray-500 text-sm">لم يشترك في أي كورس بعد</p>
                ) : (
                  <div className="space-y-2">
                    {data.student.accessCodes.map((ac) => (
                      <div
                        key={ac.id}
                        className="flex items-center justify-between bg-gray-900/50 rounded-lg px-4 py-3 border border-gray-700"
                      >
                        <div>
                          <p className="text-white text-sm font-medium">{ac.course.title}</p>
                          <p className="text-gray-400 text-xs">
                            {ac.course.subject} · أ. {ac.course.teacher.name}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            ac.isActive
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {ac.isActive ? "نشط" : "موقوف"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quiz results grouped by course */}
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">
                  نتائج الاختبارات ({data.quizResults.length})
                </h4>
                {data.quizResults.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد نتائج اختبارات بعد</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(resultsByCourse ?? {}).map(
                      ([courseId, { courseTitle, results }]) => (
                        <div key={courseId}>
                          <p className="text-gray-300 text-xs font-semibold mb-2">
                            📚 {courseTitle}
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-gray-700">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-700 text-gray-500">
                                  <th className="text-right px-3 py-2 font-medium">الاختبار</th>
                                  <th className="text-right px-3 py-2 font-medium">الدرجة</th>
                                  <th className="text-right px-3 py-2 font-medium">التاريخ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-700">
                                {results.map((r) => (
                                  <tr key={r.id}>
                                    <td className="px-3 py-2 text-gray-300">{r.quiz.title}</td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={`font-bold ${
                                          r.score >= 50 ? "text-green-400" : "text-red-400"
                                        }`}
                                      >
                                        {r.score.toFixed(0)}%
                                      </span>
                                      <span className="text-gray-500">
                                        {" "}
                                        ({Math.round((r.score * r.totalQ) / 100)}/{r.totalQ})
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-400">
                                      {fmtDate(r.completedAt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Suspend / Unsuspend modal */}
      {(pendingAction === "suspend" || pendingAction === "unsuspend") && (
        <ConfirmActionModal
          title={
            pendingAction === "suspend" ? "تعليق الحساب" : "رفع التعليق"
          }
          description={
            pendingAction === "suspend"
              ? `سيتم منع الطالب "‏${data?.student.name}‏" من تسجيل الدخول والوصول للنظام. يمكن التراجع لاحقاً.`
              : `سيُعاد تفعيل حساب الطالب "‏${data?.student.name}‏" ويستطيع تسجيل الدخول مجدداً.`
          }
          actionLabel={
            pendingAction === "suspend" ? "تعليق الحساب" : "رفع التعليق"
          }
          variant="warning"
          onConfirm={handleSuspend}
          onClose={() => setPendingAction(null)}
        />
      )}

      {/* Soft-delete (archive) modal */}
      {pendingAction === "delete" && (
        <ConfirmActionModal
          title="أرشفة حساب الطالب"
          description={`سيتم نقل حساب الطالب "‏${data?.student.name}‏" إلى سلة المحذوفات. يمكن للمشرف العام استعادته لاحقاً.`}
          actionLabel="أرشفة الحساب"
          variant="danger"
          onConfirm={handleDelete}
          onClose={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
