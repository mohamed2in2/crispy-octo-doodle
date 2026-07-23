"use client";
import { useState } from "react";

export default function AIEducationalActions() {
  const [actions, setActions] = useState([
    { id: "EXPLAIN", name: "شرح الفكرة والموضوع", enabled: true, desc: "يقوم بالشرح بدقة بناءً على منهج المادة" },
    { id: "QUIZ_GEN", name: "توليد كويز سريع", enabled: true, desc: "يولّد أسئلة خيارات متعددة مع شرح الإجابة" },
    { id: "SUMMARY", name: "ملخص الدرس", enabled: true, desc: "استخراج نقاط القوة والملخص التنفيذي" },
    { id: "GRADE_REQ", name: "طلب تعديل الدرجة", enabled: true, desc: "مراجعة إجابة الطالب وإنشاء طلب للمعلم" },
    { id: "HINT", name: "إعطاء تلميح دون حل", enabled: true, desc: "مساعدة الطالب على الوصول للحل بنفسه" },
  ]);

  const toggle = (id: string) => {
    setActions(actions.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((act) => (
          <div key={act.id} className="rounded-2xl p-5 flex items-center justify-between" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div>
              <h3 className="font-bold text-base text-[var(--ink)] mb-1">{act.name}</h3>
              <p className="text-xs text-[var(--ink-2)]">{act.desc}</p>
            </div>
            <button
              onClick={() => toggle(act.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none ${
                act.enabled ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-3)]"
              }`}
            >
              {act.enabled ? "مُفعّل ✅" : "معطّل ❌"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
