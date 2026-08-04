import type { Metadata } from "next";

// Imported here rather than in globals.css, matching the financial layout, so
// the root layout and the existing global stylesheet stay untouched and cannot
// regress. Tokens must come first — the other two sheets read from them.
import "@/styles/classic-tokens.css";
import "@/styles/classic-shell.css";
import "@/styles/classic-components.css";

export const metadata: Metadata = {
	/* "الرئيسية | منصة Code-UP" */
	title:
		"\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 | \u0645\u0646\u0635\u0629 Code-UP",
	/* "رصيدك وكورساتك وإشعاراتك في مكان واحد." */
	description:
		"\u0631\u0635\u064a\u062f\u0643 \u0648\u0643\u0648\u0631\u0633\u0627\u062a\u0643 \u0648\u0625\u0634\u0639\u0627\u0631\u0627\u062a\u0643 \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
	alternates: {
		canonical: "https://code-up.tech/account/home",
	},
};

export default function ClassicHomeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// No wrapper markup: ClassicShell owns the entire chrome, including the
	// footer, so adding a container here would only create a second one.
	return children;
}
