"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Superadmin {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
  isActive: boolean;
}

const card = "rounded-2xl border border-gray-700 bg-gray-800 p-5";
const input =
  "w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500";

export function InstanceControlSection() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [actionPassword, setActionPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [maintOn, setMaintOn] = useState(false);
  const [maintMsg, setMaintMsg] = useState("");

  const [vCounts, setVCounts] = useState({ students: 0, teachers: 0, courses: 0 });
  const [gen, setGen] = useState({ teachers: 3, students: 15, courses: 4 });

  const [admins, setAdmins] = useState<Superadmin[]>([]);
  const [selfId, setSelfId] = useState("");
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" });

  const loadAll = useCallback(async () => {
    try {
      const [m, v, s] = await Promise.all([
        fetch("/api/admin/superadmin/maintenance", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/superadmin/virtual-data", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/superadmin/superadmins", { credentials: "include" }).then((r) => r.json()),
      ]);
      if (typeof m?.on === "boolean") {
        setMaintOn(m.on);
        setMaintMsg(m.message ?? "");
      }
      if (v && typeof v.students === "number") setVCounts(v);
      if (Array.isArray(s?.superadmins)) {
        setAdmins(s.superadmins);
        setSelfId(s.selfId ?? "");
      }
    } catch {
      toastError("تعذر تحميل لوحة التحكم");
    }
  }, [toastError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll();
  }, [loadAll]);

  const needPw = () => {
    if (!actionPassword) {
      toastError("أدخل كلمة مرور المشرف في الأعلى أولاً");
      return false;
    }
    return true;
  };

  const post = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, actionPassword }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "تعذر تنفيذ العملية");
    return json;
  };
  const patch = async (url: string, body: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, actionPassword }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "تعذر تنفيذ العملية");
    return json;
  };

  // ── Maintenance ──
  const toggleMaintenance = async () => {
    if (!needPw()) return;
    setBusy(true);
    try {
      const next = !maintOn;
      await post("/api/admin/superadmin/maintenance", { on: next, message: maintMsg });
      setMaintOn(next);
      toastSuccess(next ? "تم تفعيل وضع الصيانة" : "تم إيقاف وضع الصيانة");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };
  const saveMessage = async () => {
    if (!needPw()) return;
    setBusy(true);
    try {
      await post("/api/admin/superadmin/maintenance", { message: maintMsg });
      toastSuccess("تم حفظ رسالة الصيانة");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  // ── Virtual data ──
  const generate = async () => {
    if (!needPw()) return;
    setBusy(true);
    try {
      const r = await post("/api/admin/superadmin/virtual-data", { action: "generate", ...gen });
      toastSuccess(
        `تم إنشاء ${r.created.teachers} مدرس و${r.created.students} طالب و${r.created.courses} كورس`
      );
      await loadAll();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };
  const clearVirtual = async () => {
    if (!needPw()) return;
    setBusy(true);
    try {
      const r = await post("/api/admin/superadmin/virtual-data", { action: "clear" });
      toastSuccess(`تم حذف ${r.cleared.users} حساب و${r.cleared.courses} كورس تجريبي`);
      await loadAll();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  // ── Superadmins ──
  const renameAdmin = async (id: string, name: string) => {
    if (!needPw()) return;
    try {
      await patch(`/api/admin/superadmin/superadmins/${id}`, { name });
      toastSuccess("تم تحديث الاسم");
      await loadAll();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    }
  };
  const changePw = async (id: string, password: string) => {
    if (!needPw()) return;
    try {
      await patch(`/api/admin/superadmin/superadmins/${id}`, { password });
      toastSuccess("تم تغيير كلمة المرور");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    }
  };
  const clearPw = async (id: string, name: string) => {
    if (!needPw()) return;
    if (!window.confirm(`هل تريد حذف كلمة مرور "${name}"؟ لن يتمكن من تسجيل الدخول بكلمة مرور بعد ذلك.`)) return;
    try {
      await patch(`/api/admin/superadmin/superadmins/${id}`, { clearPassword: true });
      toastSuccess("تم حذف كلمة المرور");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    }
  };
  const toggleActive = async (a: Superadmin) => {
    if (!needPw()) return;
    try {
      await patch(`/api/admin/superadmin/superadmins/${a.id}`, { isActive: !a.isActive });
      await loadAll();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    }
  };
  const removeAdmin = async (id: string) => {
    if (!needPw()) return;
    try {
      const res = await fetch(`/api/admin/superadmin/superadmins/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "تعذر الحذف");
      toastSuccess("تم حذف المشرف");
      await loadAll();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    }
  };
  const createAdmin = async () => {
    if (!needPw()) return;
    setBusy(true);
    try {
      await post("/api/admin/superadmin/superadmins", newAdmin);
      toastSuccess("تم إنشاء مشرف عام جديد");
      setNewAdmin({ name: "", email: "", password: "" });
      await loadAll();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6" dir="rtl">
      {/* Shared action password */}
      <div className={card}>
        <label className="mb-1 block text-xs text-gray-400">
          كلمة مرور المشرف (مطلوبة لكل إجراء في هذه الصفحة)
        </label>
        <input
          type="password"
          value={actionPassword}
          onChange={(e) => setActionPassword(e.target.value)}
          placeholder="••••••••"
          className={input}
        />
      </div>

      {/* Maintenance */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">وضع الصيانة</h3>
            <p className="text-xs text-gray-400">
              يُظهر للزوّار صفحة «شيء رائع قادم». المشرفون العامون و /adminpanel يعملون بشكل طبيعي.
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={busy}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              maintOn ? "bg-emerald-500" : "bg-gray-600"
            }`}
            aria-pressed={maintOn}
            aria-label="تبديل وضع الصيانة"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                maintOn ? "left-1" : "right-1"
              }`}
            />
          </button>
        </div>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
            maintOn ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-300"
          }`}
        >
          {maintOn ? "الصيانة مُفعّلة الآن" : "الموقع يعمل بشكل طبيعي"}
        </span>
        <textarea
          value={maintMsg}
          onChange={(e) => setMaintMsg(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="رسالة الصيانة المعروضة للزوّار..."
          className={`${input} mt-3 resize-none`}
        />
        <button
          onClick={saveMessage}
          disabled={busy}
          className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
        >
          حفظ الرسالة
        </button>
      </div>

      {/* Virtual data */}
      <div className={card}>
        <h3 className="font-bold text-white">البيانات التجريبية</h3>
        <p className="text-xs text-gray-400">
          إنشاء طلاب ومدرسين وكورسات وهمية بفيديوهات يوتيوب للعرض والتجربة. الحالي:{" "}
          <b className="text-gray-200">
            {vCounts.students} طالب · {vCounts.teachers} مدرس · {vCounts.courses} كورس
          </b>
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["teachers", "students", "courses"] as const).map((k) => (
            <div key={k}>
              <label className="mb-1 block text-[11px] text-gray-400">
                {k === "teachers" ? "مدرسون" : k === "students" ? "طلاب" : "كورسات"}
              </label>
              <input
                type="number"
                min={1}
                value={gen[k]}
                onChange={(e) => setGen({ ...gen, [k]: Math.max(1, parseInt(e.target.value) || 1) })}
                className={input}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            توليد بيانات تجريبية
          </button>
          <button
            onClick={clearVirtual}
            disabled={busy}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            حذف كل البيانات التجريبية
          </button>
        </div>
      </div>

      {/* Superadmins management */}
      <div className={card}>
        <h3 className="mb-3 font-bold text-white">إدارة المشرفين العامين</h3>
        <div className="space-y-2">
          {admins.map((a) => (
            <SuperadminRow
              key={a.id}
              admin={a}
              isSelf={a.id === selfId}
              onRename={renameAdmin}
              onChangePw={changePw}
              onClearPw={clearPw}
              onToggleActive={toggleActive}
              onRemove={removeAdmin}
            />
          ))}
        </div>

        {/* Create */}
        <div className="mt-4 border-t border-gray-700 pt-4">
          <p className="mb-2 text-xs font-semibold text-gray-300">إضافة مشرف عام</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              placeholder="الاسم"
              className={input}
            />
            <input
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="البريد الإلكتروني"
              className={input}
            />
            <input
              type="password"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              placeholder="كلمة المرور"
              className={input}
            />
          </div>
          <button
            onClick={createAdmin}
            disabled={busy}
            className="mt-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
          >
            إنشاء
          </button>
        </div>
      </div>
    </div>
  );
}

function SuperadminRow({
  admin,
  isSelf,
  onRename,
  onChangePw,
  onClearPw,
  onToggleActive,
  onRemove,
}: {
  admin: Superadmin;
  isSelf: boolean;
  onRename: (id: string, name: string) => void;
  onChangePw: (id: string, password: string) => void;
  onClearPw: (id: string, name: string) => void;
  onToggleActive: (a: Superadmin) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState(admin.name);
  const [pw, setPw] = useState("");

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-bold text-white">{admin.email}</span>
        {admin.isOwner && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
            المالك
          </span>
        )}
        {!admin.isActive && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
            موقوف
          </span>
        )}
        {isSelf && <span className="text-[10px] text-gray-500">(أنت)</span>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-[10px] text-gray-500">الاسم</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={() => onRename(admin.id, name)}
          className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600"
        >
          حفظ الاسم
        </button>
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-[10px] text-gray-500">كلمة مرور جديدة</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="••••••"
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={() => {
            if (pw) {
              onChangePw(admin.id, pw);
              setPw("");
            }
          }}
          className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-600"
        >
          تغيير كلمة المرور
        </button>
        {!admin.isOwner && (
          <button
            onClick={() => onClearPw(admin.id, admin.name)}
            title="حذف كلمة المرور (يمنع تسجيل الدخول بكلمة مرور)"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/25"
          >
            🗑 حذف كلمة المرور
          </button>
        )}
        {!admin.isOwner && (
          <>
            <button
              onClick={() => onToggleActive(admin)}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
            >
              {admin.isActive ? "إيقاف" : "تفعيل"}
            </button>
            {!isSelf && (
              <button
                onClick={() => onRemove(admin.id)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
              >
                حذف
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
