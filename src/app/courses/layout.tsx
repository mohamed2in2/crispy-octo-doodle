import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الكورسات | منصة الأصلي التعليمية",
  description: "اكتشف مجموعة متنوعة من الكورسات التعليمية في الرياضيات، الفيزياء، الكيمياء، والأحياء للطلاب المصريين من الصف السادس حتى الثالث الثانوي.",
  openGraph: {
    title: "الكورسات | منصة الأصلي التعليمية",
    description: "اكتشف مجموعة متنوعة من الكورسات التعليمية في الرياضيات، الفيزياء، الكيمياء، والأحياء للطلاب المصريين من الصف السادس حتى الثالث الثانوي.",
    url: "https://alasly.live/courses",
    siteName: "منصة الأصلي",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://alasly.live/courses",
  },
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
