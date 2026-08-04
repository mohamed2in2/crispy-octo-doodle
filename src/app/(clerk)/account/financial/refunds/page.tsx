/**
 * Refund requests.
 *
 * Exists so that a student who has asked for money back can see that the request
 * is alive without having to ask a human. The status vocabulary is the one from
 * the refund state machine, unchanged, so what the student sees is what the
 * system actually thinks.
 */

import { Amount } from "@/components/ui/Amount"
import { Card } from "@/components/ui/Card"
import { DataTable } from "@/components/ui/DataTable"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageHeader } from "@/components/ui/PageHeader"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { listRefunds } from "@/lib/financial/data"
import { formatTimestamp, refundLabel } from "@/lib/financial/status"
import type { RefundRecord } from "@/lib/financial/types"

export const dynamic = "force-dynamic"

export default async function RefundsPage() {
	const refunds = await listRefunds()

	return (
		<>
			<PageHeader
				title={COPY.refunds}
				description={COPY.refundsDescription}
			/>

			<Card flush>
				<DataTable<RefundRecord>
					rows={refunds}
					rowKey={(refund) => refund.id}
					caption={COPY.refunds}
					columns={[
						{
							header: COPY.invoiceNumber,
							cell: (refund) => refund.invoiceNumber,
						},
						{
							header: COPY.amount,
							numeric: true,
							cell: (refund) => (
								<Amount piastres={refund.amountPiastres} size="sm" />
							),
						},
						{
							header: COPY.status,
							cell: (refund) => refundLabel(refund.status),
						},
						{
							header: COPY.requestedAt,
							cell: (refund) => formatTimestamp(refund.requestedAt),
						},
					]}
					emptyState={
						<EmptyState
							title={COPY.refundsEmptyTitle}
							explanation={COPY.refundsEmptyExplanation}
							action={
								<ActionLink
									href="/account/financial/invoices"
									variant="secondary"
								>
									{COPY.invoices}
								</ActionLink>
							}
						/>
					}
				/>
			</Card>
		</>
	)
}
}