import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "البيئات التعليمية | منصة الأصلي التعليمية",
  description: "ادخل إلى بيئات تعليمية تفاعلية في الرياضيات، الفيزياء، الكيمياء، البرمجة والمزيد في منصة الأصلي التعليمية.",
  openGraph: {
    title: "البيئات التعليمية | منصة الأصلي التعليمية",
    description: "ادخل إلى بيئات تعليمية تفاعلية في الرياضيات، الفيزياء، الكيمياء، البرمجة والمزيد في منصة الأصلي التعليمية.",
    url: "https://alasly.live/environments",
    siteName: "منصة الأصلي",
    locale: "ar_EG",
    type: "website",
  },
  alternates: {
    canonical: "https://alasly.live/environments",
  },
};

export default function EnvironmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
