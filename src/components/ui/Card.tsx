/**
 * Card
 *
 * The standard surface. Structure is fixed — header, body, optional footer —
 * because a predictable card shape is most of what makes a set of pages feel
 * like one product rather than a collection of screens.
 *
 * `title` and `description` are props rather than children so the heading level
 * and the description styling cannot drift between call sites.
 */

import type { ReactNode } from "react"

export type CardProps = {
	title?: ReactNode
	/** One line explaining what this card is for. Worth writing. */
	description?: ReactNode
	/** Rendered opposite the title: a status badge, a link, a small action. */
	headerAction?: ReactNode
	children?: ReactNode
	/** Primary action row, visually separated at the bottom. */
	footer?: ReactNode
	/** Remove body padding when the child manages its own edges, e.g. a table. */
	flush?: boolean
	/** Heading level, so cards nested under a page heading stay in order. */
	headingLevel?: 2 | 3 | 4
	className?: string
	id?: string
}

export function Card({
	title,
	description,
	headerAction,
	children,
	footer,
	flush = false,
	headingLevel = 3,
	className,
	id,
}: CardProps) {
	const Heading = `h${headingLevel}` as "h2" | "h3" | "h4"
	const hasHeader = Boolean(title || description || headerAction)

	return (
		<section
			id={id}
			className={`ds-card${className ? ` ${className}` : ""}`}
		>
			{hasHeader ? (
				<div className="ds-card__header">
					<div>
						{title ? (
							<Heading className="ds-card__title">{title}</Heading>
						) : null}
						{description ? (
							<p className="ds-card__description">{description}</p>
						) : null}
					</div>
					{headerAction ? <div>{headerAction}</div> : null}
				</div>
			) : null}

			{children ? (
				<div
					className={`ds-card__body${flush ? " ds-card__body--flush" : ""}`}
				>
					{children}
				</div>
			) : null}

			{footer ? <div className="ds-card__footer">{footer}</div> : null}
		</section>
	)
}

/** Card-shaped placeholder, for use while the real card's data loads. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
	const rows = Array.from({ length: Math.max(1, lines) })

	return (
		<div className="ds-card" aria-hidden="true">
			<div className="ds-card__header">
				<span className="ds-skeleton" style={{ width: 160, height: 16 }} />
			</div>
			<div className="ds-card__body">
				{rows.map((_unused, index) => (
					<span
						key={index}
						className="ds-skeleton"
						style={{
							width: index === rows.length - 1 ? "60%" : "100%",
							height: 12,
							marginBottom: 12,
						}}
					/>
				))}
			</div>
		</div>
	)
}

export default Card
