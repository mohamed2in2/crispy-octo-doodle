import { SHELL } from "@/components/classic/copy";
import { HOME } from "@/components/classic/home-copy";
import { ClassicShell } from "@/components/classic/ClassicShell";
import {
	IconBook,
	IconChart,
	IconHelp,
	IconInbox,
	IconReceipt,
	IconWallet,
} from "@/components/classic/icons";
import {
	Badge,
	Band,
	Card,
	Empty,
	LinkButton,
	Section,
	Stat,
	Steps,
	Tile,
	Tiles,
} from "@/components/classic/pieces";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";

/*
 * The main page.
 *
 * Reads top to bottom as one thought: how much money you have, what you can do
 * with it, how topping up works, then what happened recently. No dashboard
 * grid of twelve equal-weight widgets — that layout forces the student to
 * decide what matters, which is the platform's job, not theirs.
 */

// Reads cookies through the data layer, so it can never be statically rendered.
export const dynamic = "force-dynamic";

/**
 * Western digits on purpose.
 *
 * Intl with an "ar-EG" locale renders Arabic-Indic numerals, which are correct
 * but unfamiliar to students who see Western digits on every bank app and
 * kiosk receipt they touch. Money is the one place to prioritise recognition
 * over orthographic purity.
 */
function formatPounds(piastres: number): string {
	const pounds = piastresToPounds(piastres);
	const formatted = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(pounds);
	return `${formatted} ${SHELL.currency}`;
}

function formatWhen(iso: string): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("ar-EG", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export default async function AccountHomePage() {
	const [wallet, notifications] = await Promise.all([
		getWalletSummary(),
		getNotifications(),
	]);

	const balanceLabel = formatPounds(wallet.balancePiastres);
	const recent = notifications.notifications.slice(0, 4);

	return (
		<ClassicShell
			title={SHELL.home}
			balanceLabel={balanceLabel}
			unreadCount={notifications.unreadCount}
		>
			{notifications.unavailable ? (
				<Band tone="info" text={HOME.unavailable} />
			) : null}

			{/*
			 * Balance first, and large. It is the single number a student opens
			 * this page to see, and burying it under a greeting banner is what
			 * makes them go looking for it in the menu every single visit.
			 */}
			<Card
				title={HOME.topUpTitle}
				description={HOME.topUpDesc}
				icon={<IconWallet size={26} />}
				footer={
					<LinkButton
						href="/account/financial/wallet"
						label={HOME.topUpAction}
						inline
					/>
				}
			>
				<Stat
					label={HOME.balanceLabel}
					value={balanceLabel}
					hint={
						wallet.pendingPiastres > 0
							? `${HOME.pending}: ${formatPounds(wallet.pendingPiastres)}`
							: undefined
					}
				/>

				<Steps steps={[...HOME.topUpSteps]} />
			</Card>

			<Section title={HOME.quickAccess}>
				<Tiles>
					<Tile
						href="/courses"
						title={SHELL.courses}
						description={HOME.coursesDesc}
						icon={<IconBook />}
					/>
					<Tile
						href="/quizzes"
						title={SHELL.questionBank}
						description={HOME.quizzesDesc}
						icon={<IconHelp />}
					/>
					<Tile
						href="/homeworks"
						title={HOME.homeworks}
						description={HOME.homeworksDesc}
						icon={<IconReceipt />}
					/>
					<Tile
						href="/leaderboard"
						title={HOME.leaderboard}
						description={HOME.leaderboardDesc}
						icon={<IconChart />}
					/>
				</Tiles>
			</Section>

			<Section title={SHELL.notifications} moreHref="/account/notifications">
				<Card>
					{recent.length === 0 ? (
						<Empty
							icon={<IconInbox />}
							title={HOME.noNotifications}
							text={HOME.noNotificationsWhy}
							action={
								<LinkButton
									href="/courses"
									label={SHELL.courses}
									inline
								/>
							}
						/>
					) : (
						<ul className="c-list">
							{recent.map((item) => (
								<li className="c-list__item" key={item.id}>
									<div className="c-list__grow">
										<p className="c-list__title">{item.title}</p>
										<p className="c-list__meta">{formatWhen(item.createdAt)}</p>
									</div>
									{!item.isRead ? (
										<Badge label={SHELL.notifications} tone="blue" />
									) : null}
								</li>
							))}
						</ul>
					)}
				</Card>
			</Section>
		</ClassicShell>
	);
}
