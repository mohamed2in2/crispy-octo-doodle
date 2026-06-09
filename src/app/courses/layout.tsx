import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الكورسات | منصة Code-UP التعليمية",
  description: "اكتشف مجموعة متنوعة من الكورسات التعليمية في الرياضيات، الفيزياء، الكيمياء، والأحياء للطلاب المصريين من الصف السادس حتى الثالث الثانوي.",
  openGraph: {
    title: "الكورسات | منصة Code-UP التعليمية",
    description: "اكتشف مجموعة متنوعة من الكورسات التعليمية في الرياضيات، الفيزياء، الكيمياء، والأحياء للطلاب المصريين من الصف السادس حتى الثالث الثانوي.",
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
