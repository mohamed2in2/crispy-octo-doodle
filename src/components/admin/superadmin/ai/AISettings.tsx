"use client";
import { useState } from "react";

export default function AISettings() {
  const [primaryProvider, setPrimaryProvider] = useState("deepseek");
  const [maxTokens, setMaxTokens] = useState(1200);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="font-bold text-base text-[var(--ink)]">الإعدادات العامة للخدمة الذكية</h3>
        
        <div>
          <label className="text-xs font-bold text-[var(--ink-2)] block mb-1">المزود الرئيسي الافتراضي</label>
          <select value={primaryProvider} onChange={(e) => setPrimaryProvider(e.target.value)} className="w-full max-w-xs p-2.5 rounded-xl text-sm bg-[var(--surface-2)] border border-[var(--border)] text-[var(--ink)]">
            <option value="deepseek">DeepSeek V4 Flash</option>
            <option value="gemini">Gemini Flash Pool</option>
            <option value="groq">Groq Llama 3</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--ink-2)] block mb-1">الحد الأقصى للتوكنات للإجابة الواحدة (Max Tokens)</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-full max-w-xs p-2.5 rounded-xl text-sm bg-[var(--surface-2)] border border-[var(--border)] text-[var(--ink)]"
          />
        </div>

        <button className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--brand)] text-white hover:opacity-90 transition-opacity">
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}
