/**
 * AlertBand
 *
 * A single band of explanatory or cautionary text.
 *
 * It returns null when there is no message. That behaviour is the point: call
 * sites can render `<AlertBand tone="warning" message={maybeMessage} />`
 * unconditionally without guarding, and no empty coloured box appears when
 * there is nothing to say.
 */

import type { ReactNode } from "react"

export type AlertTone = "info" | "success" | "warning" | "danger"

export type AlertBandProps = {
	tone?: AlertTone
	/** Optional bold first line. */
	title?: ReactNode
	/** The message. Nullish or empty means the component renders nothing. */
	message?: ReactNode
	children?: ReactNode
	/**
	 * Announce this to assistive technology when it appears after a user action,
	 * such as a failed payment. Leave false for static page copy.
	 */
	live?: boolean
}

const TONE_CLASS: Record<AlertTone, string> = {
	info: "ds-alert--info",
	success: "ds-alert--success",
	warning: "ds-alert--warning",
	danger: "ds-alert--danger",
}

export function AlertBand({
	tone = "info",
	title,
	message,
	children,
	live = false,
}: AlertBandProps) {
	const body = message ?? children

	// Nothing to say: render nothing at all.
	if (body === null || body === undefined || body === false || body === "") {
		return null
	}

	return (
		<div
			className={`ds-alert ${TONE_CLASS[tone]}`}
			role={tone === "danger" ? "alert" : "note"}
			aria-live={live ? "polite" : undefined}
		>
			<div className="ds-alert__body">
				{title ? <p className="ds-alert__title">{title}</p> : null}
				<div>{body}</div>
			</div>
		</div>
	)
}

export default AlertBand
