import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/classic-tokens.css";
import "@/styles/classic-course-bridge.css";
import "@/styles/codeup-signature.css";

export const metadata: Metadata = {
  title: "كورسات منصة Code-UP التعليمية | CodeUp Academy",
  description: "تصفح واكتشف كورسات الرياضيات والعلوم والبرمجة والتكنولوجيا على Code-UP.",
  openGraph: {
    title: "كورسات منصة Code-UP التعليمية | CodeUp Academy",
    description: "تصفح واكتشف الكورسات المتاحة على Code-UP.",
    url: "https://code-up.tech/courses",
    siteName: "منصة Code-UP التعليمية",
    locale: "ar_EG",
    type: "website",
  },
  alternates: { canonical: "https://code-up.tech/courses" },
};

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return <div className="c-course-zone cu-signature">{children}</div>;
}
