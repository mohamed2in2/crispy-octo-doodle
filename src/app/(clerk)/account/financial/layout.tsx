import type { Metadata } from "next";

import { ClassicShell } from "@/components/classic/ClassicShell";
import { getWalletSummary } from "@/lib/financial/data";
import { piastresToPounds } from "@/lib/financial/money";
import { getNotifications } from "@/lib/notifications/data";

import "@/styles/classic-tokens.css";
import "@/styles/classic-shell.css";
import "@/styles/classic-components.css";
import "@/styles/financial-tokens.css";
import "@/styles/financial-components.css";
import "@/styles/financial-shell.css";
import "@/styles/classic-financial-bridge.css";

export const metadata: Metadata = {
	title:
		"\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a | \u0645\u0646\u0635\u0629 Code-UP",
	description:
		"\u0631\u0635\u064a\u062f\u0643 \u0648\u0641\u0648\u0627\u062a\u064a\u0631\u0643 \u0648\u0625\u064a\u0635\u0627\u0644\u0627\u062a\u0643 \u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
	alternates: { canonical: "https://code-up.tech/account/financial" },
};

function money(p: number) {
	return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(piastresToPounds(p))} \u062c\u0646\u064a\u0647`;
}

export default async function FinancialLayout({ children }: { children: React.ReactNode }) {
	const [wallet, notices] = await Promise.all([getWalletSummary(), getNotifications()]);
	return (
		<ClassicShell
			title="\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u0627\u0644\u064a"
			balanceLabel={money(wallet.balancePiastres)}
			unreadCount={notices.unreadCount}
		>
			<div className="ds-fin-shell">
				<main className="ds-fin-shell__main">{children}</main>
			</div>
		</ClassicShell>
	);
}
