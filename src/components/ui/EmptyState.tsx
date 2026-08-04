/**
 * EmptyState
 *
 * An empty list is a question the reader is asking: "is this broken, or have I
 * just not done anything yet?" A bare "no data" label leaves that unanswered.
 *
 * `explanation` and `action` are therefore both required by the type. Every
 * empty state must say why it is empty and offer the next step. If a genuine
 * empty state has no available action, that is a signal the feature is
 * unreachable, which is worth discovering at compile time.
 */

import type { ReactNode } from "react"

export type EmptyStateProps = {
	/** Short and specific. "No invoices yet", not "Empty". */
	title: string
	/** Why it is empty, and what will make something appear here. */
	explanation: string
	/** The next step. A link or a button. */
	action: ReactNode
	/** Optional decorative glyph. Never the sole carrier of meaning. */
	icon?: ReactNode
}

export function EmptyState({
	title,
	explanation,
	action,
	icon,
}: EmptyStateProps) {
	return (
		<div className="ds-empty">
			{icon ? (
				<div aria-hidden="true" style={{ marginBottom: 16, opacity: 0.5 }}>
					{icon}
				</div>
			) : null}
			<p className="ds-empty__title">{title}</p>
			<p className="ds-empty__explanation">{explanation}</p>
			<div className="ds-empty__action">{action}</div>
		</div>
	)
}

export default EmptyState
