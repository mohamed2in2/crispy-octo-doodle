import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البيئات التعليمية | منصة Code-UP التعليمية",
  description: "ادخل إلى بيئات تعليمية تفاعلية في الرياضيات، الفيزياء، الكيمياء، البرمجة والمزيد في منصة Code-UP التعليمية.",
  openGraph: {
    title: "البيئات التعليمية | منصة Code-UP التعليمية",
    description: "ادخل إلى بيئات تعليمية تفاعلية في الرياضيات، الفيزياء، الكيمياء، البرمجة والمزيد في منصة Code-UP التعليمية.",
    url: "https://code-up.tech/environments",
    siteName: "منصة Code-UP",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://code-up.tech/environments",
  },
};

export default function EnvironmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
