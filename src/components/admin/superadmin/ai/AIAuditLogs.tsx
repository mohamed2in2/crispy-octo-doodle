"use client";
import { useState } from "react";

export default function AIAuditLogs() {
  const [logs] = useState([
    { id: 1, user: "Superadmin", action: "تغيير المزود الرئيسي إلى DeepSeek", date: "2026-07-23 10:14" },
    { id: 2, user: "Superadmin", action: "تحديث برومبت شرح المفاهيم إلى v3", date: "2026-07-22 18:30" },
  ]);

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h3 className="font-bold text-base text-[var(--ink)] mb-4">سجل تغييرات وإعدادات نظام AI</h3>
        <div className="divide-y divide-[var(--border)] text-xs">
          {logs.map(l => (
            <div key={l.id} className="py-3 flex justify-between">
              <div>
                <span className="font-bold text-[var(--brand)] ml-2">{l.user}</span>
                <span className="text-[var(--ink)]">{l.action}</span>
              </div>
              <span className="font-mono text-[var(--ink-3)]">{l.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
