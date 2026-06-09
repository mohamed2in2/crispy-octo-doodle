import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حسابي | منصة Code-UP التعليمية",
  description: "إدارة حسابك الشخصي وتحديث بياناتك الدراسية في منصة Code-UP التعليمية.",
  openGraph: {
    title: "حسابي | منصة Code-UP التعليمية",
    description: "إدارة حسابك الشخصي وتحديث بياناتك الدراسية في منصة Code-UP التعليمية.",
    url: "https://code-up.tech/account",
    siteName: "منصة Code-UP",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://code-up.tech/account",
  },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
