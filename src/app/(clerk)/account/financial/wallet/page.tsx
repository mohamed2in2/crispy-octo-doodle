/**
 * Wallet ledger.
 *
 * Every movement on the balance, with the direction stated in words as well as
 * by sign and colour. Colour alone is not an acceptable way to distinguish money
 * arriving from money leaving.
 */

import { Amount } from "@/components/ui/Amount"
import { Card } from "@/components/ui/Card"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { getWalletSummary } from "@/lib/financial/data"
import { formatTimestamp } from "@/lib/financial/status"
import type { WalletEntry } from "@/lib/financial/types"

export const dynamic = "force-dynamic"

export default async function WalletPage() {
	const wallet = await getWalletSummary()

	return (
		<>
			<PageHeader
				title={COPY.walletLedger}
				description={COPY.walletDescription}
				actions={<ActionLink href="/account">{COPY.topUp}</ActionLink>}
			/>

			<div className="ds-fin-stack">
				<Card
					title={COPY.currentBalance}
					description={COPY.balanceExplanation}
				>
					<Amount piastres={wallet.balancePiastres} size="lg" />
				</Card>

				<Card flush>
					<DataTable<WalletEntry>
						rows={wallet.entries}
						rowKey={(entry) => entry.id}
						caption={COPY.walletLedger}
						columns={[
							{
								header: COPY.date,
								cell: (entry) => formatTimestamp(entry.occurredAt),
							},
							{ header: COPY.description, cell: (entry) => entry.description },
							{
								header: COPY.type,
								cell: (entry) =>
									entry.direction === "credit" ? COPY.credit : COPY.debit,
							},
							{
								header: COPY.amount,
								numeric: true,
								cell: (entry) => (
									<Amount
										piastres={
											entry.direction === "debit"
												? -entry.amountPiastres
												: entry.amountPiastres
										}
										size="sm"
										signed
									/>
								),
							},
						]}
						emptyState={
							<EmptyState
								title={COPY.walletEmptyTitle}
								explanation={COPY.walletEmptyExplanation}
								action={<ActionLink href="/account">{COPY.topUp}</ActionLink>}
							/>
						}
					/>
				</Card>
			</div>
		</>
	)
}
