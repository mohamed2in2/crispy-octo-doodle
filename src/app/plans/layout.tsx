import { Metadata } from "next";

export const metadata: Metadata = {
  title: "الخطط الدراسية | Code-UP",
  description: "تصفح الخطط والمسارات الدراسية المتاحة لتطوير مهاراتك بشكل منظم مع باقة من أفضل المعلمين.",
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
