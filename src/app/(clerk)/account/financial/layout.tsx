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
	title: "المركز المالي | منصة Code-UP",
	description: "رصيدك وفواتيرك وإيصالاتك وطلبات الاسترداد في مكان واحد.",
	alternates: { canonical: "https://code-up.tech/account/financial" },
};

function money(p: number) {
	return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(piastresToPounds(p))} جنيه`;
}

export default async function FinancialLayout({ children }: { children: React.ReactNode }) {
	const [wallet, notices] = await Promise.all([getWalletSummary(), getNotifications()]);
	return (
		<ClassicShell
			title="المركز المالي"
			balanceLabel={money(wallet.balancePiastres)}
			unreadCount={notices.unreadCount}
		>
			<div className="ds-fin-shell">
				<main className="ds-fin-shell__main">{children}</main>
			</div>
		</ClassicShell>
	);
}
