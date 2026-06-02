import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حسابي | منصة الأصلي التعليمية",
  description: "إدارة حسابك الشخصي وتحديث بياناتك الدراسية في منصة الأصلي التعليمية.",
  openGraph: {
    title: "حسابي | منصة الأصلي التعليمية",
    description: "إدارة حسابك الشخصي وتحديث بياناتك الدراسية في منصة الأصلي التعليمية.",
    url: "https://alasly.live/account",
    siteName: "منصة الأصلي",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://alasly.live/account",
  },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
