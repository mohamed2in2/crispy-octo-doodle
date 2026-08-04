"use client"

/**
 * FinancialNav
 *
 * The Financial Center's navigation. It is identical on every page in the
 * section and only the active item changes — a reader who has learned where
 * "invoices" is should never have to look for it again.
 *
 * A client component solely so the active route can be highlighted.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"

const BASE = "/account/financial"

type NavItem = {
	href: string
	/** Arabic label. */
	label: string
}

const ITEMS: ReadonlyArray<NavItem> = [
	// "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629" - overview
	{ href: BASE, label: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629" },
	// "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631" - invoices
	{ href: `${BASE}/invoices`, label: "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631" },
	// "\u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a" - receipts
	{
		href: `${BASE}/receipts`,
		label: "\u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a",
	},
	// "\u0633\u062c\u0644 \u0627\u0644\u0645\u062d\u0641\u0638\u0629" - wallet ledger
	{
		href: `${BASE}/wallet`,
		label: "\u0633\u062c\u0644 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
	},
	// "\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639" - payment methods
	{
		href: `${BASE}/methods`,
		label: "\u0637\u0631\u0642 \u0627\u0644\u062f\u0641\u0639",
	},
	// "\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f" - refund requests
	{
		href: `${BASE}/refunds`,
		label:
			"\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
	},
]

export function FinancialNav() {
	const pathname = usePathname()

	return (
		<nav
			className="ds-fin-nav"
			// "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a" - Financial Center
			aria-label="\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a"
		>
			<ul className="ds-fin-nav__list">
				{ITEMS.map((item) => {
					// Exact match for the overview root; prefix match for the rest, so a
					// nested invoice detail page keeps "invoices" highlighted.
					const isActive =
						item.href === BASE
							? pathname === BASE
							: pathname.startsWith(item.href)

					return (
						<li key={item.href}>
							<Link
								href={item.href}
								className="ds-fin-nav__link"
								data-active={isActive ? "true" : "false"}
								aria-current={isActive ? "page" : undefined}
							>
								{item.label}
							</Link>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}

export default FinancialNav
