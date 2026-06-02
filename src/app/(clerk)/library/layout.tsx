import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مكتبتي | منصة الأصلي التعليمية",
  description: "تصفح الكورسات التي قمت بالتسجيل فيها ومتابعة تقدمك الدراسي في منصة الأصلي التعليمية.",
  openGraph: {
    title: "مكتبتي | منصة الأصلي التعليمية",
    description: "تصفح الكورسات التي قمت بالتسجيل فيها ومتابعة تقدمك الدراسي في منصة الأصلي التعليمية.",
    url: "https://alasly.live/library",
    siteName: "منصة الأصلي",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://alasly.live/library",
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
