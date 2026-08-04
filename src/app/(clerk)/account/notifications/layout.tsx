import type { Metadata } from "next"

// Imported here rather than in globals.css so the existing global stylesheet and
// root layout stay untouched.
import "@/styles/financial-tokens.css"
import "@/styles/financial-components.css"
import "@/styles/financial-shell.css"

export const metadata: Metadata = {
	// "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a | \u0645\u0646\u0635\u0629 Code-UP"
	title:
		"\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a | \u0645\u0646\u0635\u0629 Code-UP",
	description:
		"\u0643\u0644 \u0627\u0644\u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u0645\u0647\u0645\u0629 \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
	alternates: {
		canonical: "https://code-up.tech/account/notifications",
	},
}

export default function NotificationsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<div
			style={{
				maxWidth: 820,
				marginInline: "auto",
				padding: "var(--ds-space-8) var(--ds-space-6) var(--ds-space-16)",
			}}
		>
			{children}
		</div>
	)
}
