/**
 * Timeline
 *
 * The lifecycle of a payment, rendered as an ordered list.
 *
 * Future steps are rendered greyed out rather than omitted. This is deliberate:
 * a student looking at a pending invoice needs to see that confirmation is a
 * step that has not happened yet, rather than infer from its absence that
 * something has gone wrong. Showing the whole path is what converts "did my
 * money disappear" into "I am waiting".
 */

import type { ReactNode } from "react"

export type TimelineStepState = "done" | "current" | "future" | "failed"

export type TimelineStep = {
	/** What happened, or will happen. */
	label: string
	state: TimelineStepState
	/** Timestamp or supporting detail. Omit for steps not yet reached. */
	meta?: ReactNode
}

export type TimelineProps = {
	steps: ReadonlyArray<TimelineStep>
	/**
	 * Announce changes to assistive technology. Enable where the timeline is
	 * polled while the reader watches, such as an unpaid invoice.
	 */
	live?: boolean
}

const STATE_CLASS: Record<TimelineStepState, string> = {
	done: "ds-timeline__item--done",
	current: "ds-timeline__item--current",
	future: "ds-timeline__item--future",
	failed: "ds-timeline__item--failed",
}

export function Timeline({ steps, live = false }: TimelineProps) {
	if (steps.length === 0) {
		return null
	}

	return (
		<ol className="ds-timeline" aria-live={live ? "polite" : undefined}>
			{steps.map((step, index) => (
				<li
					key={`${index}-${step.label}`}
					className={`ds-timeline__item ${STATE_CLASS[step.state]}`}
					aria-current={step.state === "current" ? "step" : undefined}
				>
					<span className="ds-timeline__dot" aria-hidden="true" />
					<div className="ds-timeline__label">{step.label}</div>
					{step.meta ? (
						<div className="ds-timeline__meta">{step.meta}</div>
					) : null}
				</li>
			))}
		</ol>
	)
}

export default Timeline
