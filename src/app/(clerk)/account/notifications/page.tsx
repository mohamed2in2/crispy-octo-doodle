/**
 * Notifications Center.
 *
 * Fully wired to the existing API: reads GET /api/notifications and marks all
 * read via POST. No fixtures.
 *
 * Unread state is signalled three ways — a text label, a stronger border, and
 * placement — because colour alone is not sufficient for a student who cannot
 * distinguish it.
 */

import { ClassicShell } from "@/components/classic/ClassicShell"
import { AlertBand } from "@/components/ui/AlertBand"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { ActionLink } from "@/components/financial/ActionLink"
import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton"
import { NOTIFICATIONS_COPY } from "@/lib/notifications/copy"
import { getNotifications } from "@/lib/notifications/data"
import { getWalletSummary } from "@/lib/financial/data"
import { piastresToPounds } from "@/lib/financial/money"
import { COPY } from "@/lib/financial/copy"
import { formatTimestamp } from "@/lib/financial/status"

export const dynamic = "force-dynamic"

function money(p: number) {
	return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(piastresToPounds(p))} \u062c\u0646\u064a\u0647`
}

export default async function NotificationsPage() {
	const [{ notifications, unreadCount, unavailable }, wallet] = await Promise.all([
		getNotifications(),
		getWalletSummary(),
	])

	return (
		<ClassicShell
			title={NOTIFICATIONS_COPY.title}
			balanceLabel={money(wallet.balancePiastres)}
			unreadCount={unreadCount}
		>
			<PageHeader
				title={NOTIFICATIONS_COPY.title}
				description={NOTIFICATIONS_COPY.description}
				actions={<MarkAllReadButton unreadCount={unreadCount} />}
			/>

			{unavailable ? (
				<AlertBand
					tone="danger"
					title={NOTIFICATIONS_COPY.unavailableTitle}
					message={NOTIFICATIONS_COPY.unavailableExplanation}
				/>
			) : notifications.length === 0 ? (
				<Card>
					<EmptyState
						title={NOTIFICATIONS_COPY.emptyTitle}
						explanation={NOTIFICATIONS_COPY.emptyExplanation}
						action={
							<ActionLink href="/account/financial" variant="secondary">
								{COPY.sectionTitle}
							</ActionLink>
						}
					/>
				</Card>
			) : (
				<div className="ds-fin-stack">
					{notifications.map((notification) => (
						<Card
							key={notification.id}
							title={notification.title}
							description={formatTimestamp(notification.createdAt)}
							headerAction={
								notification.isRead ? null : (
									<span className="ds-badge ds-badge--warning">
										<span className="ds-badge__dot" aria-hidden="true" />
										{NOTIFICATIONS_COPY.unread}
									</span>
								)
							}
							footer={
								notification.link ? (
									<ActionLink href={notification.link} variant="secondary">
										{NOTIFICATIONS_COPY.view}
									</ActionLink>
								) : undefined
							}
						>
							<p style={{ margin: 0, color: "var(--ds-text-muted)" }}>
								{notification.body}
							</p>
						</Card>
					))}
				</div>
			)}
		</ClassicShell>
	)
}
