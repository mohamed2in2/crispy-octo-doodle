import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/classic-tokens.css";
import "@/styles/classic-course-bridge.css";

export const metadata: Metadata = {
	title: "\u0643\u0648\u0631\u0633\u0627\u062a \u0645\u0646\u0635\u0629 Code-UP \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629 | CodeUp Academy",
	description: "\u062a\u0635\u0641\u062d \u0648\u0627\u0643\u062a\u0634\u0641 \u0643\u0648\u0631\u0633\u0627\u062a \u0627\u0644\u0631\u064a\u0627\u0636\u064a\u0627\u062a \u0648\u0627\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u0628\u0631\u0645\u062c\u0629 \u0648\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627 \u0639\u0644\u0649 Code-UP.",
	openGraph: {
		title: "\u0643\u0648\u0631\u0633\u0627\u062a \u0645\u0646\u0635\u0629 Code-UP \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629 | CodeUp Academy",
		description: "\u062a\u0635\u0641\u062d \u0648\u0627\u0643\u062a\u0634\u0641 \u0627\u0644\u0643\u0648\u0631\u0633\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0639\u0644\u0649 Code-UP.",
		url: "https://code-up.tech/courses",
		siteName: "\u0645\u0646\u0635\u0629 Code-UP \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629",
		locale: "ar_EG",
		type: "website",
	},
	alternates: { canonical: "https://code-up.tech/courses" },
};

export default function CoursesLayout({ children }: { children: ReactNode }) {
	return <div className="c-course-zone">{children}</div>;
}
