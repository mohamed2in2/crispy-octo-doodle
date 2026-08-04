"use client"

/**
 * MarkAllReadButton
 *
 * POSTs to /api/notifications, which marks every unread notification for the
 * signed-in user as read, then refreshes the server component tree so the list
 * and the count update together.
 *
 * Renders nothing when there is nothing unread — a button that cannot change
 * anything should not be offered.
 */

import { useRouter } from "next/navigation"
import { useState } from "react"

import { NOTIFICATIONS_COPY } from "@/lib/notifications/copy"

export type MarkAllReadButtonProps = {
	unreadCount: number
}

export function MarkAllReadButton({ unreadCount }: MarkAllReadButtonProps) {
	const router = useRouter()
	const [pending, setPending] = useState(false)

	if (unreadCount === 0) {
		return null
	}

	async function markAll() {
		// Guard against a double submit producing two writes.
		if (pending) return
		setPending(true)

		try {
			const response = await fetch("/api/notifications", {
				method: "POST",
				// Same-origin credentials so the session cookie is sent.
				credentials: "same-origin",
			})

			if (response.ok) {
				// Re-renders the server component, which re-reads the API. Deliberately
				// not an optimistic local update: the count shown must be the count the
				// server actually holds.
				router.refresh()
			}
		} catch {
			// Swallowed on purpose. A failed mark-as-read is not worth an error
			// dialog; the unread badges simply remain, which is accurate.
		} finally {
			setPending(false)
		}
	}

	return (
		<button
			type="button"
			onClick={markAll}
			disabled={pending}
			className="ds-copy__button"
			aria-busy={pending}
		>
			{NOTIFICATIONS_COPY.markAllRead}
			{" "}
			<span dir="ltr">({unreadCount})</span>
		</button>
	)
}

export default MarkAllReadButton
