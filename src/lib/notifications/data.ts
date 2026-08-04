/**
 * Notifications data access.
 *
 * Fully wired to the existing `GET /api/notifications`, which returns the 20
 * most recent notifications for the signed-in user plus an unread count. There
 * are no fixtures in this module.
 *
 * The route's `select` clause is the contract:
 * `{ id, type, title, body, link, isRead, createdAt }`.
 */

import { authorizedGetJson } from "@/lib/server/authorizedFetch"

/**
 * Known notification types, from the comment on the Prisma `Notification` model.
 *
 * Typed as a union with a `string` escape hatch rather than a closed union: the
 * server can add a type at any time and an unrecognised one must still render,
 * not crash the page.
 */
export type NotificationType =
	| "streak_milestone"
	| "exam_live"
	| "grade_resolved"
	| "referral_joined"
	| (string & {})

export type NotificationRecord = {
	id: string
	type: NotificationType
	title: string
	body: string
	link: string | null
	isRead: boolean
	createdAt: string
}

export type NotificationsResult = {
	notifications: ReadonlyArray<NotificationRecord>
	unreadCount: number
	/**
	 * True when the read itself failed, as distinct from the user genuinely
	 * having no notifications. The page renders different copy for each.
	 */
	unavailable: boolean
}

/** Raw response shape. Every field is treated as untrusted. */
type NotificationsApiResponse = {
	notifications?: Array<{
		id?: string
		type?: string
		title?: string
		body?: string
		link?: string | null
		isRead?: boolean
		createdAt?: string
	}>
	unreadCount?: number
}

export async function getNotifications(): Promise<NotificationsResult> {
	const payload =
		await authorizedGetJson<NotificationsApiResponse>("/api/notifications")

	if (!payload) {
		return { notifications: [], unreadCount: 0, unavailable: true }
	}

	const rows = Array.isArray(payload.notifications)
		? payload.notifications
		: []

	const notifications: NotificationRecord[] = rows.map((row, index) => ({
		id: String(row.id ?? `notification-${index}`),
		type: typeof row.type === "string" ? row.type : "",
		title: typeof row.title === "string" ? row.title : "",
		body: typeof row.body === "string" ? row.body : "",
		// Only same-origin paths are treated as navigable, so a stored absolute URL
		// cannot turn a notification into an off-site redirect.
		link:
			typeof row.link === "string" && row.link.startsWith("/")
				? row.link
				: null,
		isRead: row.isRead === true,
		createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
	}))

	// Recomputed rather than trusted, so the badge can never disagree with the
	// list rendered beneath it.
	const unreadCount = notifications.filter((item) => !item.isRead).length

	return { notifications, unreadCount, unavailable: false }
}
