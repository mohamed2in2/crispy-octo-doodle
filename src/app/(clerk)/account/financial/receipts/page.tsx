/**
 * Receipts.
 *
 * Separate from invoices because they answer different questions: an invoice is
 * a request for money, a receipt is proof that it was paid. Students need the
 * second one for parents and for reimbursement.
 */

import { Amount } from "@/components/ui/Amount"
import { Card } from "@/components/ui/Card"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { listReceipts } from "@/lib/financial/data"
import { formatTimestamp } from "@/lib/financial/status"
import type { ReceiptRecord } from "@/lib/financial/types"

export const dynamic = "force-dynamic"

export default async function ReceiptsPage() {
	const receipts = await listReceipts()

	return (
		<>
			<PageHeader
				title={COPY.receipts}
				description={COPY.receiptsDescription}
			/>

			<Card flush>
				<DataTable<ReceiptRecord>
					rows={receipts}
					rowKey={(receipt) => receipt.id}
					caption={COPY.receipts}
					columns={[
						{ header: COPY.receiptNumber, cell: (receipt) => receipt.number },
						{
							header: COPY.invoiceNumber,
							cell: (receipt) => receipt.invoiceNumber,
						},
						{
							header: COPY.amount,
							numeric: true,
							cell: (receipt) => (
								<Amount piastres={receipt.amountPiastres} size="sm" />
							),
						},
						{
							header: COPY.date,
							cell: (receipt) => formatTimestamp(receipt.issuedAt),
						},
						{
							header: COPY.details,
							cell: (receipt) => (
								<ActionLink
									href={`/account/financial/invoices/${receipt.invoiceId}`}
									variant="secondary"
								>
									{COPY.details}
								</ActionLink>
							),
						},
					]}
					emptyState={
						<EmptyState
							title={COPY.receiptsEmptyTitle}
							explanation={COPY.receiptsEmptyExplanation}
							action={<ActionLink href="/account">{COPY.topUp}</ActionLink>}
						/>
					}
				/>
			</Card>
		</>
	)
}
