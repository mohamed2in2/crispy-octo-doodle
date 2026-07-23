"use client";
import { useState } from "react";

export default function AIFeatureFlags() {
  const [flags, setFlags] = useState([
    { id: "ai_global_enabled", label: "تشغيل النظام الذكي العام", enabled: true },
    { id: "ai_streaming", label: "البث المباشر للإجابات (Streaming)", enabled: true },
    { id: "ai_knowledge_rag", label: "ربط قاعدة المعرفة المنهجية (RAG)", enabled: true },
    { id: "ai_student_memory", label: "تفعيل الذاكرة الشخصية للطلاب", enabled: true },
    { id: "ai_grade_adjustments", label: "تلقي ورفع طلبات تعديل الدرجات", enabled: true },
    { id: "ai_parent_reports", label: "توليد تقارير أولياء الأمور", enabled: true },
  ]);

  const toggle = (id: string) => {
    setFlags(flags.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flags.map((f) => (
          <div key={f.id} className="rounded-2xl p-5 flex items-center justify-between" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div>
              <span className="font-bold text-sm text-[var(--ink)] block mb-1">{f.label}</span>
              <span className="font-mono text-xs text-[var(--ink-3)]">{f.id}</span>
            </div>
            <button
              onClick={() => toggle(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none ${
                f.enabled ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-3)]"
              }`}
            >
              {f.enabled ? "مُفعل" : "معطل"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
