/**
 * StatusBadge
 *
 * Renders a payment or invoice status.
 *
 * This component takes a status key and nothing else. It deliberately does not
 * accept a `label` or a `color` prop, because the moment a caller can choose
 * the colour, two pages will show the same status in different colours and the
 * vocabulary stops being trustworthy. The mapping lives here, once.
 *
 * Colour is never the only signal. Every badge renders its Arabic label as
 * text, so the status survives greyscale printing, low-contrast screens, and
 * colour blindness.
 */

export type PaymentStatus =
	| "awaiting_payment"
	| "paid"
	| "expired"
	| "cancelled"
	| "failed"
	| "refunded"
	| "partially_refunded"

type Tone = "success" | "warning" | "danger" | "neutral"

type StatusDefinition = {
	label: string
	tone: Tone
}

/**
 * The complete status vocabulary. `Record` is used rather than a partial map so
 * that adding a member to `PaymentStatus` without adding its label becomes a
 * compile error instead of a blank badge in production.
 */
const STATUS: Record<PaymentStatus, StatusDefinition> = {
	// "\u0645\u0639\u0644\u0642\u0629" - waiting on the student to pay. Not an error state.
	awaiting_payment: { label: "\u0645\u0639\u0644\u0642\u0629", tone: "warning" },
	// "\u0645\u062f\u0641\u0648\u0639\u0629"
	paid: { label: "\u0645\u062f\u0641\u0648\u0639\u0629", tone: "success" },
	// "\u0645\u0646\u062a\u0647\u064a\u0629" - the window closed. Recoverable by issuing a new invoice.
	expired: { label: "\u0645\u0646\u062a\u0647\u064a\u0629", tone: "neutral" },
	// "\u0645\u0644\u063a\u0627\u0629" - deliberately stopped, by the student or by staff.
	cancelled: { label: "\u0645\u0644\u063a\u0627\u0629", tone: "neutral" },
	// "\u0641\u0634\u0644\u062a" - the provider rejected it. This one needs to look wrong.
	failed: { label: "\u0641\u0634\u0644\u062a", tone: "danger" },
	// "\u0645\u0633\u062a\u0631\u062f\u0629"
	refunded: { label: "\u0645\u0633\u062a\u0631\u062f\u0629", tone: "neutral" },
	// "\u0645\u0633\u062a\u0631\u062f\u0629 \u062c\u0632\u0626\u064a\u0627\u064b"
	partially_refunded: {
		label: "\u0645\u0633\u062a\u0631\u062f\u0629 \u062c\u0632\u0626\u064a\u0627\u064b",
		tone: "neutral",
	},
}

const TONE_CLASS: Record<Tone, string> = {
	success: "ds-badge--success",
	warning: "ds-badge--warning",
	danger: "ds-badge--danger",
	neutral: "ds-badge--neutral",
}

export type StatusBadgeProps = {
	status: PaymentStatus
	className?: string
}

/** The Arabic label for a status, for use in prose, page titles and exports. */
export function statusLabel(status: PaymentStatus): string {
	return STATUS[status].label
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
	const definition = STATUS[status]

	// A status key arriving from the database that is not in the vocabulary must
	// not crash the page it appears on.
	if (!definition) {
		return (
			<span
				className={`ds-badge ds-badge--neutral${className ? ` ${className}` : ""}`}
			>
				<span className="ds-badge__dot" aria-hidden="true" />
				{String(status)}
			</span>
		)
	}

	return (
		<span
			className={`ds-badge ${TONE_CLASS[definition.tone]}${
				className ? ` ${className}` : ""
			}`}
		>
			<span className="ds-badge__dot" aria-hidden="true" />
			{definition.label}
		</span>
	)
}

export default StatusBadge
