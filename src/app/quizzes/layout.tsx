import type { ReactNode } from "react";
import "@/styles/classic-tokens.css";
import "@/styles/classic-shell.css";
import "@/styles/classic-components.css";
import "@/styles/classic-center-bridge.css";
import "@/styles/codeup-signature.css";
export default function QuizzesLayout({ children }: { children: ReactNode }) { return <div className="c-center-zone cu-signature">{children}</div>; }
