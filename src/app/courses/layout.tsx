import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الكورسات | منصة Code-UP الكورسات",
  description: "اكتشف مجموعة متنوعة من الكورسات الكورسات في مجالات متنوعة مثل التكنولوجيا والعلوم للمتعلمين المصريين لمختلف الأعمار والمستويات.",
  openGraph: {
    title: "الكورسات | منصة Code-UP الكورسات",
    description: "اكتشف مجموعة متنوعة من الكورسات الكورسات في مجالات متنوعة مثل التكنولوجيا والعلوم للمتعلمين المصريين لمختلف الأعمار والمستويات.",
    url: "https://code-up.tech/courses",
    siteName: "منصة Code-UP",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://code-up.tech/courses",
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
