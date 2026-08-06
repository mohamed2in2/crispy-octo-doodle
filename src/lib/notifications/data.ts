/**
 * Notifications data access.
 *
 * Scoped directly to Prisma and session for reliable server-side rendering,
 * with zero HTTP loopback network risks.
 */

import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
	unavailable: boolean
}

export async function getNotifications(): Promise<NotificationsResult> {
	try {
		const session = await getSession()
		if (!session) {
			return { notifications: [], unreadCount: 0, unavailable: false }
		}

		const rows = await prisma.notification.findMany({
			where: { userId: session.id },
			orderBy: { createdAt: "desc" },
			take: 20,
			select: { id: true, type: true, title: true, body: true, link: true, isRead: true, createdAt: true },
		})

		const notifications: NotificationRecord[] = rows.map((row) => ({
			id: row.id,
			type: row.type ?? "",
			title: row.title ?? "",
			body: row.body ?? "",
			link: row.link && row.link.startsWith("/") ? row.link : null,
			isRead: row.isRead === true,
			createdAt: row.createdAt ? row.createdAt.toISOString() : "",
		}))

		const unreadCount = notifications.filter((item) => !item.isRead).length

		return { notifications, unreadCount, unavailable: false }
	} catch {
		return { notifications: [], unreadCount: 0, unavailable: true }
	}
}
