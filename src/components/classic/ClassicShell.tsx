"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { SHELL } from "./copy";
import { ACCOUNT_TABS, SIDEBAR, isActive } from "./nav";
import type { NavIconName, TabItem } from "./nav";
import { FloatingAssistant, SiteFooter } from "./SiteFooter";
import {
	IconBell,
	IconBook,
	IconChevronEnd,
	IconChevronStart,
	IconHome,
	IconMoon,
	IconPlay,
	IconSearch,
	IconUser,
	IconUsers,
	IconWallet,
} from "./icons";

/*
 * The single client boundary for the app chrome.
 *
 * Only two things here genuinely need the client: the collapse toggle and the
 * theme toggle. Splitting the chrome into four boundaries to save a few
 * kilobytes would mean four copies of the active-state logic, and
 * inconsistent active states are exactly the "collection of pages" feeling
 * this redesign exists to remove.
 *
 * The footer and the floating assistant are rendered here rather than per
 * page, for the same reason: chrome that appears on some pages and not others
 * is the single loudest symptom of that problem.
 */

const NAV_ICONS: Record<NavIconName, (props: { size?: number }) => ReactNode> = {
	home: IconHome,
	book: IconBook,
	users: IconUsers,
	user: IconUser,
	play: IconPlay,
	wallet: IconWallet,
};

export type ClassicShellProps = {
	/** Shown in the top bar. Should name the page, not the product. */
	title: string;
	/** Formatted balance. The caller converts to pounds; this only prints. */
	balanceLabel: string;
	unreadCount?: number;
	/** First letter of the student's name, or a fallback glyph. */
	userInitial?: string;
	/** Pass null to hide the strip on pages that do not need it. */
	tabs?: TabItem[] | null;
	children: ReactNode;
};

export function ClassicShell({
	title,
	balanceLabel,
	unreadCount = 0,
	userInitial = "\u0637" /* طالب — student */,
	tabs = ACCOUNT_TABS,
	children,
}: ClassicShellProps) {
	const pathname = usePathname() ?? "";
	const [collapsed, setCollapsed] = useState(false);

	/*
	 * The theme lives entirely on the <html> element. Mirroring it into React
	 * state would mean reading localStorage in an effect and calling setState,
	 * which is both a hydration mismatch and an eslint error in this repo
	 * (react-hooks/set-state-in-effect). Reading the attribute at click time is
	 * simpler and cannot desynchronise.
	 */
	const toggleTheme = useCallback(() => {
		const root = document.documentElement;
		const next =
			root.getAttribute("data-classic-theme") === "light" ? "dark" : "light";
		root.setAttribute("data-classic-theme", next);
		try {
			window.localStorage.setItem("classic-theme", next);
		} catch {
			// Safari in private mode throws on setItem. A theme that forgets
			// itself is a far smaller problem than a header that throws.
		}
	}, []);

	return (
		<div className="c-app" data-collapsed={collapsed ? "true" : "false"}>
			<a className="c-skip" href="#c-main">
				{SHELL.skipToContent}
			</a>

			<aside className="c-sidebar">
				<Link className="c-sidebar__brand" href="/account/home">
					Code-UP
				</Link>

				<button
					type="button"
					className="c-sidebar__collapse"
					onClick={() => setCollapsed((value) => !value)}
					aria-expanded={!collapsed}
				>
					<span className="c-sidebar__collapse-text">
						{collapsed ? SHELL.expand : SHELL.collapse}
					</span>
					<span className="c-sidebar__collapse-icon" aria-hidden="true">
						{collapsed ? <IconChevronStart /> : <IconChevronEnd />}
					</span>
				</button>

				<nav aria-label={SHELL.pages}>
					<ul className="c-sidebar__nav">
						{SIDEBAR.map((item) => {
							const Icon = NAV_ICONS[item.icon];
							const active = isActive(pathname, item.href, item.exact);
							return (
								<li key={item.key}>
									<Link
										className="c-sidebar__link"
										href={item.href}
										data-active={active ? "true" : "false"}
										aria-current={active ? "page" : undefined}
										title={item.label}
									>
										<span className="c-sidebar__icon">
											<Icon />
										</span>
										<span className="c-sidebar__label">{item.label}</span>
									</Link>

									{item.sub && item.sub.length > 0 ? (
										<ul className="c-sidebar__sub">
											{item.sub.map((child) => {
												const childActive = isActive(pathname, child.href);
												return (
													<li key={child.key}>
														<Link
															className="c-sidebar__sublink"
															href={child.href}
															data-active={childActive ? "true" : "false"}
														>
															{child.label}
														</Link>
													</li>
												);
											})}
										</ul>
									) : null}
								</li>
							);
						})}
					</ul>
				</nav>
			</aside>

			<div className="c-col">
				<header className="c-topbar">
					<h1 className="c-topbar__title">{title}</h1>

					{/*
					 * Submits to /courses rather than a dedicated /search page,
					 * because no /search route exists in this app. A search box
					 * that 404s is worse than one with a narrower promise.
					 */}
					<form className="c-topbar__search" action="/courses" method="get">
						<div className="c-topbar__search-field">
							<span className="c-topbar__search-icon">
								<IconSearch />
							</span>
							<input
								className="c-topbar__search-input"
								type="search"
								name="q"
								aria-label={SHELL.search}
								placeholder={SHELL.searchPlaceholder}
							/>
						</div>
					</form>

					<div className="c-topbar__tools">
						<Link className="c-wallet-chip" href="/account/financial">
							<IconWallet size={16} />
							<span dir="ltr">{balanceLabel}</span>
						</Link>

						<Link
							className="c-iconbtn"
							href="/account/notifications"
							aria-label={SHELL.notifications}
						>
							<IconBell />
							{unreadCount > 0 ? (
								<span className="c-iconbtn__dot">
									{unreadCount > 9 ? "9+" : unreadCount}
								</span>
							) : null}
						</Link>

						<button
							type="button"
							className="c-iconbtn"
							onClick={toggleTheme}
							aria-label={SHELL.theme}
						>
							<IconMoon />
						</button>

						<Link className="c-avatar" href="/account" aria-label={SHELL.account}>
							{userInitial}
						</Link>
					</div>
				</header>

				{/*
				 * A segmented control, not the arrow-flanked scrolling strip this
				 * replaced. Two reasons. The arrows hid destinations behind a
				 * gesture nobody performs — a tab you cannot see is a tab you do
				 * not have. And the arrow strip is the single most recognisable
				 * piece of chrome on the platform this app is measured against;
				 * reproducing it made every page look borrowed.
				 *
				 * Wrapping is safe here because the strip sits directly under the
				 * top bar and above the content: gaining a row pushes the page
				 * down once, on a viewport change, rather than on every scroll.
				 */}
				{tabs && tabs.length > 0 ? (
					<nav className="c-seg" aria-label={title}>
						{tabs.map((tab) => {
							const active = isActive(pathname, tab.href, tab.exact);
							return (
								<Link
									key={tab.key}
									className="c-seg__item"
									href={tab.href}
									data-active={active ? "true" : "false"}
									aria-current={active ? "page" : undefined}
								>
									{tab.label}
								</Link>
							);
						})}
					</nav>
				) : null}

				<main className="c-main" id="c-main">
					{children}
				</main>

				<SiteFooter />
			</div>

			<FloatingAssistant />
		</div>
	);
}
