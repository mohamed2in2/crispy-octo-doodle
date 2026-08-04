import type { Metadata } from "next"

import { FinancialNav } from "@/components/financial/FinancialNav"

// Imported here rather than in globals.css so that the existing global
// stylesheet and root layout are untouched and cannot regress.
import "@/styles/financial-tokens.css"
import "@/styles/financial-components.css"
import "@/styles/financial-shell.css"

export const metadata: Metadata = {
	// "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a | \u0645\u0646\u0635\u0629 Code-UP"
	title:
		"\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a | \u0645\u0646\u0635\u0629 Code-UP",
	description:
		"\u0631\u0635\u064a\u062f\u0643 \u0648\u0641\u0648\u0627\u062a\u064a\u0631\u0643 \u0648\u0625\u064a\u0635\u0627\u0644\u0627\u062a\u0643 \u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
	alternates: {
		canonical: "https://code-up.tech/account/financial",
	},
}

export default function FinancialLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<div className="ds-fin-shell">
			<FinancialNav />
			<main className="ds-fin-shell__main">{children}</main>
		</div>
	)
}
