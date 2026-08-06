"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { IconGlobe, IconEye, IconLink, IconBook } from "@/components/admin/AdminIcons";

type Profile = {
  slug: string;
  displayName: string | null;
  bio: string | null;
  photoUrl: string | null;
  bannerUrl: string | null;
  navColor: string | null;
  accentColor: string | null;
  socials: string | null; // JSON
  featuredCourseId: string | null;
  isPublished: boolean;
  bookingEnabled: boolean;
  arabicEnabled: boolean;
  languagesEnabled: boolean;
  priceMonthly1: number | null;
  priceMonthly3: number | null;
  priceMonthly6: number | null;
  originalMonthly3: number | null;
  originalMonthly6: number | null;
  langSurcharge1: number | null;
  langSurcharge3: number | null;
  langSurcharge6: number | null;
  enableMonthly1: boolean;
  enableMonthly3: boolean;
  enableMonthly6: boolean;
  priceMonthly: number | null;
  priceTermly: number | null;
  priceYearly: number | null;
  discountMonthly: number | null;
  discountTermly: number | null;
  discountYearly: number | null;
  courseStartDate: string | null;
  bookingContactUrl: string | null;
};

type Socials = { facebook?: string; youtube?: string; tiktok?: string };

const input =
  "w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--ink)] text-sm placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-sky-400/60 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all";
const label = "block text-xs font-semibold text-[var(--ink-muted)] mb-1.5";
const card = "bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 sm:p-6";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--ink-muted)]/40 text-sm font-semibold transition-colors";

function fileToResizedDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img") as HTMLImageElement;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TeacherPublicProfile() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [p, setP] = useState<Profile | null>(null);
  const [socials, setSocials] = useState<Socials>({});
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([
      fetch("/api/admin/profile", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/courses", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([prof, crs]) => {
      if (prof?.profile) {
        setP({
          bookingEnabled: true,
          arabicEnabled: true,
          languagesEnabled: true,
          enableMonthly1: true,
          enableMonthly3: true,
          enableMonthly6: true,
          priceMonthly1: 200,
          priceMonthly3: 500,
          priceMonthly6: 1000,
          originalMonthly3: 600,
          originalMonthly6: 1200,
          langSurcharge1: 50,
          langSurcharge3: 150,
          langSurcharge6: 300,
          ...prof.profile,
        });
        try { setSocials(prof.profile.socials ? JSON.parse(prof.profile.socials) : {}); } catch { setSocials({}); }
      }
      setCourses((crs?.courses ?? []).map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })));
    }).finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => (prev ? { ...prev, [k]: v } : prev));

  const checkSlug = useCallback((slug: string) => {
    if (!slug || slug.length < 2) { setSlugState("invalid"); return; }
    setSlugState("checking");
    fetch(`/api/admin/profile/slug-check?slug=${encodeURIComponent(slug)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSlugState(d.available ? "ok" : d.reason === "invalid" ? "invalid" : "taken"))
      .catch(() => setSlugState("idle"));
  }, []);

  useEffect(() => {
    if (!p?.slug) return;
    const t = setTimeout(() => checkSlug(p.slug), 450);
    return () => clearTimeout(t);
  }, [p?.slug, checkSlug]);

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 512);
      set("photoUrl", dataUrl);
    } catch { toastError("تعذر معالجة الصورة"); }
  };

  const save = async () => {
    if (!p) return;
    if (slugState === "taken" || slugState === "invalid") { toastError("الرابط غير صالح أو مستخدم"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, socials: JSON.stringify(socials) }),
      });
      const data = await res.json();
      if (res.ok) { setP((prev) => ({ ...prev, ...data.profile })); toastSuccess("تم حفظ صفحتك وإعدادات الحجز بنجاح"); }
      else toastError(data.error || "تعذر الحفظ");
    } catch { toastError("تعذر الحفظ"); }
    finally { setSaving(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${origin}/${p?.slug}`).then(
      () => toastSuccess("تم نسخ الرابط"),
      () => toastError("تعذر النسخ"),
    );
  };

  if (loading) return <div className="space-y-4"><div className="h-40 rounded-2xl skeleton" /><div className="h-64 rounded-2xl skeleton" /></div>;
  if (!p) return <div className={card}><p className="text-[var(--ink-muted)] text-sm">تعذر تحميل بيانات الصفحة.</p></div>;

  const slugMsg = {
    idle: "", checking: "جارٍ التحقق…", ok: "متاح ✓", taken: "مستخدم بالفعل", invalid: "غير صالح",
  }[slugState];
  const slugColor = slugState === "ok" ? "text-emerald-500" : slugState === "checking" ? "text-[var(--ink-muted)]" : "text-rose-500";

  return (
    <div className="space-y-5 max-w-3xl" dir="rtl">
      {/* Header / publish + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[var(--ink)] flex items-center gap-2"><IconGlobe className="w-5 h-5 text-sky-500" /> صفحتي العامة</h2>
          <p className="text-sm text-[var(--ink-muted)] mt-0.5">صفحتك الشخصية التي تشاركها مع طلابك — صورتك، نبذتك، وكل كورساتك.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className={ghostBtn}><IconEye className="w-4 h-4" /> معاينة</a>
          <button onClick={copyLink} className={ghostBtn}><IconLink className="w-4 h-4" /> نسخ الرابط</button>
        </div>
      </div>

      {/* Publish toggle */}
      <div className={`${card} flex items-center justify-between gap-3`}>
        <div>
          <p className="font-bold text-[var(--ink)]">{p.isPublished ? "الصفحة منشورة" : "الصفحة مسودة (غير منشورة)"}</p>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">{p.isPublished ? "أي شخص يملك الرابط يمكنه رؤيتها." : "لن تظهر للطلاب حتى تنشرها."}</p>
        </div>
        <button
          onClick={() => set("isPublished", !p.isPublished)}
          role="switch"
          aria-checked={p.isPublished}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${p.isPublished ? "bg-emerald-500" : "bg-[var(--border)]"}`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${p.isPublished ? "left-1" : "left-6"}`} />
        </button>
      </div>

      {/* Identity & Photo Section */}
      <div className={`${card} space-y-5`}>
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-[var(--bg)] border-2 border-sky-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt="صورة المدرس" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-sky-500">{(p.displayName || "؟")[0]}</span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-[var(--ink)] text-base">الصورة الشخصية للمدرس 📸</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                تظهر للطلاب في صفحة الكورسات وقائمة المدرسين.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <button onClick={() => photoInput.current?.click()} className={primaryBtn}>
              {p.photoUrl ? "تغيير الصورة" : "إضافة صورة شخصية"}
            </button>
            {p.photoUrl && (
              <button onClick={() => set("photoUrl", null)} className="px-3 py-2 text-xs text-rose-500 hover:text-rose-400 font-bold transition-colors">
                حذف الصورة
              </button>
            )}
          </div>
        </div>

        <div>
          <label className={label}>الاسم المعروض</label>
          <input className={input} value={p.displayName ?? ""} onChange={(e) => set("displayName", e.target.value)} placeholder="مثال: مستر أحمد" />
        </div>
        <div>
          <label className={label}>نبذة تعريفية</label>
          <textarea rows={3} className={`${input} resize-none`} value={p.bio ?? ""} onChange={(e) => set("bio", e.target.value)} placeholder="خبرة في تدريس البرمجة والذكاء الاصطناعي…" />
        </div>

        {/* Slug */}
        <div>
          <label className={label}>رابط الصفحة</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ink-muted)] shrink-0 font-mono" dir="ltr">{origin}/</span>
            <input className={`${input} font-mono`} dir="ltr" value={p.slug} onChange={(e) => set("slug", e.target.value)} placeholder="MR-AHMED" />
          </div>
          {slugMsg && <p className={`text-[11px] mt-1.5 font-semibold ${slugColor}`}>{slugMsg}</p>}
        </div>
      </div>

      {/* Theme colors */}
      <div className={`${card} space-y-4`}>
        <h3 className="font-bold text-[var(--ink)]">ألوان الصفحة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { key: "navColor", label: "لون الشريط العلوي", fallback: "#0b0f19" },
            { key: "accentColor", label: "لون الأزرار والتمييز", fallback: "#6366f1" },
          ] as const).map(({ key, label: lbl, fallback }) => (
            <div key={key}>
              <label className={label}>{lbl}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={p[key] ?? fallback} onChange={(e) => set(key, e.target.value)} className="w-10 h-10 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer shrink-0" />
                <input className={`${input} font-mono`} dir="ltr" value={p[key] ?? fallback} onChange={(e) => set(key, e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured course + socials */}
      <div className={`${card} space-y-4`}>
        <div>
          <label className={label}><IconBook className="w-3.5 h-3.5 inline -mt-0.5 me-1" />الكورس المميّز (يظهر أولاً)</label>
          <select className={input} value={p.featuredCourseId ?? ""} onChange={(e) => set("featuredCourseId", e.target.value || null)}>
            <option value="">بدون</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { key: "facebook", label: "Facebook" },
            { key: "youtube", label: "YouTube" },
            { key: "tiktok", label: "TikTok" },
          ] as const).map(({ key, label: lbl }) => (
            <div key={key}>
              <label className={label}>{lbl}</label>
              <input className={`${input} font-mono`} dir="ltr" value={socials[key] ?? ""} onChange={(e) => setSocials((s) => ({ ...s, [key]: e.target.value }))} placeholder="https://…" />
            </div>
          ))}
        </div>
      </div>

      {/* ── NEW: Comprehensive Booking & Subscription Settings ── */}
      <div className={`${card} space-y-6`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h3 className="font-bold text-[var(--ink)] flex items-center gap-2 text-base">
              <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              إعدادات الحجز والاشتراك 💳
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mt-1">تحديد تفعيل الحجز، لغات التدريس المتاحة، وأسعار خطط 1 شهر، 3 شهور، و 6 شهور.</p>
          </div>

          {/* Booking ON/OFF Switch */}
          <div className="flex items-center gap-3 bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--ink)]">
              {p.bookingEnabled ? "الحجز مفعل ✅" : "الحجز مغلق 🔒"}
            </span>
            <button
              type="button"
              onClick={() => set("bookingEnabled", !p.bookingEnabled)}
              role="switch"
              aria-checked={p.bookingEnabled}
              className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${p.bookingEnabled ? "bg-emerald-500" : "bg-[var(--border)]"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${p.bookingEnabled ? "left-1" : "left-6"}`} />
            </button>
          </div>
        </div>

        {/* Language Availability Options */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-3">
          <h4 className="font-bold text-xs text-[var(--ink)]">🌐 لغات الشرح والتدريس المتاحة للطلاب:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:border-emerald-500/50">
              <input
                type="checkbox"
                checked={p.arabicEnabled}
                onChange={(e) => set("arabicEnabled", e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-xs text-[var(--ink)]">متاح بالحجز عربي 🇪🇬</span>
                <p className="text-[10px] text-[var(--ink-muted)]">إمكانية اختيار المسار العربي</p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:border-emerald-500/50">
              <input
                type="checkbox"
                checked={p.languagesEnabled}
                onChange={(e) => set("languagesEnabled", e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-xs text-[var(--ink)]">متاح بالحجز لغات 🇬🇧</span>
                <p className="text-[10px] text-[var(--ink-muted)]">إمكانية اختيار مسار اللغات</p>
              </div>
            </label>
          </div>
          {!p.languagesEnabled && (
            <p className="text-[11px] text-amber-400 font-semibold px-1">
              سيظهر للطلاب نص: &quot;متاح للحجز باللغة العربية فقط (This teacher teaches Arabic only)&quot;
            </p>
          )}
        </div>

        {/* 1 Month, 3 Months, 6 Months Subscription Plans */}
        <div className="space-y-4">
          {/* 1 Month Plan */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                <span>⚡</span> اشتراك شهر واحد (1 Month)
              </h4>
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.enableMonthly1}
                  onChange={(e) => set("enableMonthly1", e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
                تفعيل الخطة
              </label>
            </div>
            {p.enableMonthly1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={label}>سعر العربي (جنيه)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.priceMonthly1 ?? 200}
                    onChange={(e) => set("priceMonthly1", e.target.value ? Number(e.target.value) : null)}
                    placeholder="200"
                  />
                </div>
                <div>
                  <label className={label}>إضافة سعر اللغات (جنيه)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.langSurcharge1 ?? 50}
                    onChange={(e) => set("langSurcharge1", e.target.value ? Number(e.target.value) : null)}
                    placeholder="+50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3 Months Plan */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                <span>📚</span> اشتراك 3 شهور (3 Months)
              </h4>
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.enableMonthly3}
                  onChange={(e) => set("enableMonthly3", e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
                تفعيل الخطة
              </label>
            </div>
            {p.enableMonthly3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={label}>سعر العربي الساري (جنيه)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.priceMonthly3 ?? 500}
                    onChange={(e) => set("priceMonthly3", e.target.value ? Number(e.target.value) : null)}
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className={label}>السعر العربي قبل الخصم (مشطوب)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.originalMonthly3 ?? 600}
                    onChange={(e) => set("originalMonthly3", e.target.value ? Number(e.target.value) : null)}
                    placeholder="600"
                  />
                </div>
                <div>
                  <label className={label}>إضافة سعر اللغات (جنيه)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.langSurcharge3 ?? 150}
                    onChange={(e) => set("langSurcharge3", e.target.value ? Number(e.target.value) : null)}
                    placeholder="+150"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6 Months Plan */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                <span>🎓</span> اشتراك 6 شهور (6 Months)
              </h4>
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.enableMonthly6}
                  onChange={(e) => set("enableMonthly6", e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
                تفعيل الخطة
              </label>
            </div>
            {p.enableMonthly6 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={label}>سعر العربي الساري (جنيه)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.priceMonthly6 ?? 1000}
                    onChange={(e) => set("priceMonthly6", e.target.value ? Number(e.target.value) : null)}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className={label}>السعر العربي قبل الخصم (مشطوب)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.originalMonthly6 ?? 1200}
                    onChange={(e) => set("originalMonthly6", e.target.value ? Number(e.target.value) : null)}
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className={label}>إضافة سعر اللغات (جنيه)</label>
                  <input
                    type="number"
                    min="0"
                    className={input}
                    value={p.langSurcharge6 ?? 300}
                    onChange={(e) => set("langSurcharge6", e.target.value ? Number(e.target.value) : null)}
                    placeholder="+300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className={label}>📅 تاريخ بدء أول كورس</label>
            <input
              type="date"
              className={input}
              value={p.courseStartDate ? p.courseStartDate.slice(0, 10) : ""}
              onChange={(e) => set("courseStartDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
          <div>
            <label className={label}>🔗 رابط التواصل / الحجز (واتساب)</label>
            <input
              className={`${input} font-mono`}
              dir="ltr"
              value={p.bookingContactUrl ?? ""}
              onChange={(e) => set("bookingContactUrl", e.target.value || null)}
              placeholder="https://wa.me/201234567890"
            />
            <p className="text-[10px] text-[var(--ink-muted)] mt-1">رابط واتساب أو رقم الهاتف المخصص لتلقي طلبات الحجز المباشرة.</p>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className={`${primaryBtn} w-full py-3 text-base`}>
        {saving ? "جارٍ حفظ إعداداتك…" : "حفظ بيانات الصفحة وإعدادات الحجز 💾"}
      </button>
    </div>
  );
}
