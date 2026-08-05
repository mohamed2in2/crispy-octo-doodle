import type { ReactNode } from "react";
import "@/styles/classic-tokens.css";
import "@/styles/codeup-signature.css";

export default function ClerkSignatureLayout({ children }: { children: ReactNode }) {
  return <div className="cu-signature">{children}</div>;
}
