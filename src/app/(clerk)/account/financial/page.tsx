/**
 * Financial Center overview.
 *
 * Answers, in this order: how much do I have, is anything of mine in flight, and
 * what happened recently. Anything that does not serve one of those three
 * questions belongs on a sub-page.
 */

import { Amount } from "@/components/ui/Amount"
import { AlertBand } from "@/components/ui/AlertBand"
import { Card } from "@/components/ui/Card"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { getWalletSummary, listInvoices } from "@/lib/financial/data"
import { formatTimestamp } from "@/lib/financial/status"
import type { InvoiceRecord } from "@/lib/financial/types"

// Money must never be served stale.
export const dynamic = "force-dynamic"

export default async function FinancialOverviewPage() {
	const [wallet, invoices] = await Promise.all([
		getWalletSummary(),
		listInvoices(),
	])

	const recent = invoices.slice(0, 5)

	return (
		<>
			<PageHeader
				title={COPY.sectionTitle}
				description={COPY.overviewDescription}
				actions={
					<ActionLink href="/account">{COPY.topUp}</ActionLink>
				}
			/>

			<div className="ds-fin-stack">
				<Card
					title={COPY.currentBalance}
					description={COPY.balanceExplanation}
				>
					<Amount piastres={wallet.balancePiastres} size="hero" />
				</Card>

				{/*
				 * Renders nothing when there is nothing pending. When there is, it
				 * answers the only question a student in that state has.
				 */}
				<AlertBand
					tone="warning"
					title={wallet.pendingPiastres > 0 ? COPY.pendingTitle : undefined}
					message={
						wallet.pendingPiastres > 0 ? (
							<span>
								<Amount piastres={wallet.pendingPiastres} size="sm" />{" "}
								{COPY.pendingExplanation}
							</span>
						) : undefined
					}
				/>

				<Card
					title={COPY.latestInvoices}
					headerAction={
						<ActionLink href="/account/financial/invoices" variant="secondary">
							{COPY.viewAll}
						</ActionLink>
					}
					flush
				>
					<DataTable<InvoiceRecord>
						rows={recent}
						rowKey={(invoice) => invoice.id}
						caption={COPY.latestInvoices}
						columns={[
							{
								header: COPY.invoiceNumber,
								cell: (invoice) => invoice.number,
							},
							{
								header: COPY.amount,
								numeric: true,
								cell: (invoice) => (
									<Amount piastres={invoice.amountPiastres} size="sm" />
								),
							},
							{
								header: COPY.status,
								cell: (invoice) => <StatusBadge status={invoice.status} />,
							},
							{
								header: COPY.details,
								cell: (invoice) => (
									<ActionLink
										href={`/account/financial/invoices/${invoice.id}`}
										variant="secondary"
									>
										{COPY.details}
									</ActionLink>
								),
							},
						]}
						emptyState={
							<EmptyState
								title={COPY.invoicesEmptyTitle}
								explanation={COPY.invoicesEmptyExplanation}
								action={<ActionLink href="/account">{COPY.topUp}</ActionLink>}
							/>
						}
					/>
				</Card>

				<Card title={COPY.walletLedger} flush>
					<DataTable
						rows={wallet.entries.slice(0, 5)}
						rowKey={(entry) => entry.id}
						caption={COPY.walletLedger}
						columns={[
							{
								header: COPY.date,
								cell: (entry) => formatTimestamp(entry.occurredAt),
							},
							{
								header: COPY.description,
								cell: (entry) => entry.description,
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
