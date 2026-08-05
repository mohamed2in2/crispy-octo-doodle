import Link from "next/link";
import type { ReactNode } from "react";

import { SHELL } from "./copy";

/*
 * The classic component set. All server components — none owns state.
 *
 * The shape is taken from the pattern that makes a page legible: one card
 * per page, a tinted icon square, a bold title, a short reason, the steps
 * in the brand ink, then exactly one input and one button.
 */

export type Tone = "blue" | "green" | "amber";

/* --------------------------------------------------------------------- card */

export function Card({
	title,
	description,
	icon,
	tone = "blue",
	headerAction,
	footer,
	children,
}: {
	title?: string;
	description?: string;
	icon?: ReactNode;
	tone?: Tone;
	headerAction?: ReactNode;
	footer?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<section className="c-card">
			{title ? (
				<div className="c-card__head">
					{icon ? (
						<span className="c-card__icon" data-tone={tone}>
							{icon}
						</span>
					) : null}
					<div className="c-card__headings">
						<h2 className="c-card__title">{title}</h2>
						{description ? <p className="c-card__desc">{description}</p> : null}
					</div>
					{headerAction ? (
						<div style={{ marginInlineStart: "auto", flex: "none" }}>
							{headerAction}
						</div>
					) : null}
				</div>
			) : null}

			{children ? <div className="c-card__body">{children}</div> : null}
			{footer ? <div className="c-card__foot">{footer}</div> : null}
		</section>
	);
}

/* -------------------------------------------------------------------- steps */

/**
 * Numbered instructions, in the brand ink.
 *
 * Every page that takes money says what happens next, in order, before the
 * student commits. That one habit is most of the difference between a
 * payment screen that feels safe and one that feels like a gamble.
 */
export function Steps({
	steps,
	label = SHELL.stepsLabel,
}: {
	steps: string[];
	label?: string;
}) {
	if (steps.length === 0) return null;
	return (
		<div>
			<p className="c-steps__label">{label}</p>
			<ol className="c-steps">
				{steps.map((step) => (
					<li className="c-steps__item" key={step}>
						<span>{step}</span>
					</li>
				))}
			</ol>
		</div>
	);
}

/* --------------------------------------------------------------------- stat */

export function Stat({
	label,
	value,
	hint,
	plain,
}: {
	label: string;
	value: string;
	hint?: string;
	plain?: boolean;
}) {
	return (
		<div className="c-stat">
			<span className="c-stat__label">{label}</span>
			{/* dir="ltr" so a number followed by a currency word never reorders. */}
			<span
				className={plain ? "c-stat__value c-stat__value--plain" : "c-stat__value"}
				dir="ltr"
			>
				{value}
			</span>
			{hint ? <span className="c-stat__hint">{hint}</span> : null}
		</div>
	);
}

/* --------------------------------------------------------------------- tile */

export function Tile({
	href,
	title,
	description,
	icon,
}: {
	href: string;
	title: string;
	description: string;
	icon: ReactNode;
}) {
	return (
		<Link className="c-tile" href={href}>
			<span className="c-tile__icon">{icon}</span>
			<h3 className="c-tile__title">{title}</h3>
			<p className="c-tile__desc">{description}</p>
		</Link>
	);
}

export function Tiles({ children }: { children: ReactNode }) {
	return <div className="c-tiles">{children}</div>;
}

/* -------------------------------------------------------------------- empty */

/**
 * An empty state is a screen whose only job is to hand over the action that
 * fills it. Never red: nothing has gone wrong, and colouring it like an
 * error tells the student they broke something.
 */
export function Empty({
	title,
	text,
	icon,
	action,
}: {
	title: string;
	text: string;
	icon?: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div className="c-empty">
			{icon ? <span className="c-empty__icon">{icon}</span> : null}
			<h3 className="c-empty__title">{title}</h3>
			<p className="c-empty__text">{text}</p>
			{action}
		</div>
	);
}

/* --------------------------------------------------------------------- band */

export function Band({
	tone = "info",
	title,
	text,
}: {
	tone?: "info" | "success" | "warning" | "danger";
	title?: string;
	text: string;
}) {
	return (
		<div
			className="c-band"
			data-tone={tone}
			role={tone === "danger" ? "alert" : undefined}
		>
			<div>
				{title ? <p className="c-band__title">{title}</p> : null}
				<p className="c-band__text">{text}</p>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------- badge */

export function Badge({
	label,
	tone = "neutral",
}: {
	label: string;
	tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
	return (
		<span className="c-badge" data-tone={tone === "neutral" ? undefined : tone}>
			{label}
		</span>
	);
}

/* ------------------------------------------------------------------ section */

export function Section({
	title,
	moreHref,
	moreLabel = SHELL.viewAll,
	children,
}: {
	title: string;
	moreHref?: string;
	moreLabel?: string;
	children: ReactNode;
}) {
	return (
		<section className="c-section">
			<div className="c-section__head">
				<h2 className="c-section__title">{title}</h2>
				{moreHref ? (
					<Link className="c-section__more" href={moreHref}>
						{moreLabel}
					</Link>
				) : null}
			</div>
			{children}
		</section>
	);
}

/* ------------------------------------------------------------------ buttons */

export function LinkButton({
	href,
	label,
	variant = "primary",
	inline,
	external,
}: {
	href: string;
	label: string;
	variant?: "primary" | "go" | "quiet" | "hero";
	inline?: boolean;
	external?: boolean;
}) {
	const className = ["c-btn", `c-btn--${variant}`, inline ? "c-btn--inline" : ""]
		.filter(Boolean)
		.join(" ");

	if (external) {
		return (
			<a
				className={className}
				href={href}
				target="_blank"
				rel="noopener noreferrer"
			>
				{label}
			</a>
		);
	}

	return (
		<Link className={className} href={href}>
			{label}
		</Link>
	);
}
