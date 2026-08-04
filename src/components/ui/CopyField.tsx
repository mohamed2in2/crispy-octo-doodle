"use client"

/**
 * CopyField
 *
 * A read-only value with a copy button. Used for payment references, which the
 * student has to carry to a kiosk or an app. Mistyping one digit means the
 * payment cannot be matched, so copying must be one tap and must visibly
 * confirm that it worked.
 *
 * The value renders LTR in a monospace face even inside an RTL page, because a
 * reference is a machine identifier and bidi reordering would change what the
 * reader transcribes.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export type CopyFieldProps = {
	value: string
	/** Accessible name for the copy button, e.g. "copy payment reference". */
	label: string
	copyText?: string
	copiedText?: string
}

export function CopyField({
	value,
	label,
	// "\u0646\u0633\u062e" (copy)
	copyText = "\u0646\u0633\u062e",
	// "\u062a\u0645 \u0627\u0644\u0646\u0633\u062e" (copied)
	copiedText = "\u062a\u0645 \u0627\u0644\u0646\u0633\u062e",
}: CopyFieldProps) {
	const [copied, setCopied] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Clear the pending timer on unmount so state is never set on a dead
	// component if the reader navigates away straight after copying.
	useEffect(() => {
		return () => {
			if (timeoutRef.current !== null) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	const handleCopy = useCallback(async () => {
		try {
			// navigator.clipboard requires a secure context and is absent on some
			// older mobile browsers. Failing silently would be worse than doing
			// nothing, so selection is left intact for a manual copy.
			if (
				typeof navigator !== "undefined" &&
				navigator.clipboard &&
				typeof navigator.clipboard.writeText === "function"
			) {
				await navigator.clipboard.writeText(value)
				setCopied(true)

				if (timeoutRef.current !== null) {
					clearTimeout(timeoutRef.current)
				}
				timeoutRef.current = setTimeout(() => setCopied(false), 2000)
			}
		} catch {
			// Clipboard permission denied. The value stays visible and selectable.
			setCopied(false)
		}
	}, [value])

	return (
		<div className="ds-copy">
			<code className="ds-copy__value">{value}</code>
			<button
				type="button"
				className="ds-copy__button"
				onClick={handleCopy}
				aria-label={label}
				data-copied={copied ? "true" : "false"}
			>
				{copied ? copiedText : copyText}
			</button>
			{/* Announced to screen readers; the button's own label does not change. */}
			<span
				aria-live="polite"
				style={{
					position: "absolute",
					width: 1,
					height: 1,
					overflow: "hidden",
					clipPath: "inset(50%)",
					whiteSpace: "nowrap",
				}}
			>
				{copied ? copiedText : ""}
			</span>
		</div>
	)
}

export default CopyField
