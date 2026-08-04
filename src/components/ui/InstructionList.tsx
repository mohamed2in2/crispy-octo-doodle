/**
 * InstructionList
 *
 * Numbered steps telling the reader what to do next.
 *
 * This exists because the most common failure on a payment page is not an error
 * — it is a student who has completed step one and does not know whether
 * anything else is required of them. Rendering the remaining steps explicitly
 * removes that doubt.
 *
 * Renders a real <ol> so the sequence is conveyed to screen readers; the visible
 * numbers come from a CSS counter.
 */

import type { ReactNode } from "react"

export type InstructionListProps = {
	steps: ReadonlyArray<ReactNode>
	className?: string
}

export function InstructionList({ steps, className }: InstructionListProps) {
	if (steps.length === 0) {
		return null
	}

	return (
		<ol className={`ds-steps${className ? ` ${className}` : ""}`}>
			{steps.map((step, index) => (
				<li key={index} className="ds-steps__item">
					{step}
				</li>
			))}
		</ol>
	)
}

export default InstructionList
