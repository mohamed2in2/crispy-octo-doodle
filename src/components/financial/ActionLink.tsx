/**
 * ActionLink
 *
 * A link styled as a button.
 *
 * Styles are inline rather than in a stylesheet on purpose: this is the only
 * component that needs them, and keeping them here means adding it required no
 * edit to any existing file. If a third variant is ever needed, promote these to
 * CSS classes at that point.
 */

import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

export type ActionLinkProps = {
	href: string
	children: ReactNode
	variant?: "primary" | "secondary"
	/** Opens in a new tab. Used for provider checkout pages. */
	external?: boolean
}

const BASE: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 8,
	padding: "10px 18px",
	borderRadius: "var(--ds-radius-control)",
	fontSize: "0.875rem",
	fontWeight: 500,
	textDecoration: "none",
	lineHeight: 1.2,
	border: "1px solid transparent",
}

const VARIANT: Record<"primary" | "secondary", CSSProperties> = {
	primary: {
		background: "var(--ds-accent)",
		color: "#ffffff",
	},
	secondary: {
		background: "var(--ds-surface-3)",
		color: "var(--ds-text)",
		borderColor: "var(--ds-border-strong)",
	},
}

export function ActionLink({
	href,
	children,
	variant = "primary",
	external = false,
}: ActionLinkProps) {
	const style = { ...BASE, ...VARIANT[variant] }

	if (external) {
		return (
			<a
				href={href}
				style={style}
				target="_blank"
				// noreferrer as well as noopener: a payment URL should not leak the
				// referring account page to the provider's analytics.
				rel="noopener noreferrer"
			>
				{children}
			</a>
		)
	}

	return (
		<Link href={href} style={style}>
			{children}
		</Link>
	)
}

export default ActionLink
