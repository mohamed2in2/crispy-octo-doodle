import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مكتبتي | منصة Code-UP التعليمية",
  description: "تصفح الكورسات التي قمت بالتسجيل فيها ومتابعة تقدمك الدراسي في منصة Code-UP التعليمية.",
  openGraph: {
    title: "مكتبتي | منصة Code-UP التعليمية",
    description: "تصفح الكورسات التي قمت بالتسجيل فيها ومتابعة تقدمك الدراسي في منصة Code-UP التعليمية.",
    url: "https://code-up.tech/library",
    siteName: "منصة Code-UP",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://code-up.tech/library",
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
