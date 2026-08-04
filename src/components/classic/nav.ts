import { SHELL } from "./copy";

/*
 * Navigation data, kept out of the components so the shape of the app is
 * reviewable without reading JSX.
 *
 * Every href was checked against the route manifest the production build
 * prints. A confident sidebar link to a 404 is worse than no link, and this
 * app has several plausible-sounding routes that do not exist (there is no
 * /search page, for instance).
 */

export type NavIconName =
	| "home"
	| "book"
	| "users"
	| "user"
	| "play"
	| "wallet";

export type NavItem = {
	key: string;
	href: string;
	label: string;
	icon: NavIconName;
	/** Match the path exactly instead of by prefix. */
	exact?: boolean;
	sub?: Array<{ key: string; href: string; label: string }>;
};

export const SIDEBAR: NavItem[] = [
	{
		key: "home",
		href: "/account/home",
		label: SHELL.home,
		icon: "home",
		exact: true,
	},
	{
		key: "courses",
		href: "/courses",
		label: SHELL.courses,
		icon: "book",
		sub: [{ key: "enrolled", href: "/library", label: SHELL.myCourses }],
	},
	{ key: "forum", href: "/plans", label: SHELL.forum, icon: "users" },
	{
		key: "account",
		href: "/account",
		label: SHELL.account,
		icon: "user",
		exact: true,
	},
	{
		key: "financial",
		href: "/account/financial",
		label: SHELL.financial,
		icon: "wallet",
		sub: [
			{
				key: "wallet",
				href: "/account/financial/wallet",
				label: SHELL.topUp,
			},
			{
				key: "methods",
				href: "/account/financial/methods",
				label: SHELL.centreCode,
			},
		],
	},
	{ key: "live", href: "/leaderboard", label: SHELL.live, icon: "play" },
];

export type TabItem = {
	key: string;
	href: string;
	label: string;
	exact?: boolean;
};

/*
 * The account tab strip.
 *
 * The strip scrolls rather than wraps. A wrapping strip changes height when
 * the viewport narrows and shoves the page content down, and that reflow is
 * most of what makes a header feel unstable.
 */
export const ACCOUNT_TABS: TabItem[] = [
	{ key: "home", href: "/account/home", label: SHELL.home, exact: true },
	{ key: "results", href: "/account", label: SHELL.results, exact: true },
	{
		key: "financial",
		href: "/account/financial",
		label: SHELL.financial,
		exact: true,
	},
	{
		key: "wallet",
		href: "/account/financial/wallet",
		label: SHELL.topUp,
	},
	{
		key: "invoices",
		href: "/account/financial/invoices",
		label: SHELL.centreCode,
	},
	{
		key: "notifications",
		href: "/account/notifications",
		label: SHELL.notifications,
	},
];

/** True when `pathname` should light up the given href. */
export function isActive(
	pathname: string,
	href: string,
	exact?: boolean,
): boolean {
	if (exact) return pathname === href;
	return pathname === href || pathname.startsWith(`${href}/`);
}
