/**
 * Invoice Center.
 *
 * The full list, newest first. Unpaid invoices are not separated into their own
 * tab: a student looking for "the one I have not paid" finds it by status, and
 * splitting the list would mean two places to look for the same thing.
 */

import { Amount } from "@/components/ui/Amount"
import { Card } from "@/components/ui/Card"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { listInvoices } from "@/lib/financial/data"
import { formatTimestamp } from "@/lib/financial/status"
import type { InvoiceRecord } from "@/lib/financial/types"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
	const invoices = await listInvoices()

	const sorted = [...invoices].sort(
		(left, right) =>
			new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
	)

	return (
		<>
			<PageHeader
				title={COPY.invoices}
				description={COPY.invoicesDescription}
			/>

			<Card flush>
				<DataTable<InvoiceRecord>
					rows={sorted}
					rowKey={(invoice) => invoice.id}
					caption={COPY.invoices}
					columns={[
						{ header: COPY.invoiceNumber, cell: (invoice) => invoice.number },
						{ header: COPY.description, cell: (invoice) => invoice.description },
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
							header: COPY.date,
							cell: (invoice) => formatTimestamp(invoice.createdAt),
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
		</>
	)
}
