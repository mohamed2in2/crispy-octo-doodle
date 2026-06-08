"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition shadow-sm font-medium print:hidden"
    >
      <Download className="w-4 h-4" />
      تحميل التقرير الشامل (PDF)
    </button>
  );
}
