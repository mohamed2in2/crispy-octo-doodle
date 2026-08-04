/**
 * Invoice detail.
 *
 * The most important page in the section. A student arrives here in one of two
 * states: they have not paid yet and need to know exactly what to do, or they
 * have paid and need to know whether it registered.
 *
 * The page is built to answer the second question without being asked, which is
 * why the timeline shows the steps still to come rather than stopping at the
 * last thing that happened.
 */

import { notFound } from "next/navigation"

import { Amount } from "@/components/ui/Amount"
import { AlertBand } from "@/components/ui/AlertBand"
import { Card } from "@/components/ui/Card"
import { CopyField } from "@/components/ui/CopyField"
import { InstructionList } from "@/components/ui/InstructionList"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Timeline } from "@/components/ui/Timeline"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { getInvoice } from "@/lib/financial/data"
import {
	buildInvoiceTimeline,
	formatTimestamp,
	isPayable,
} from "@/lib/financial/status"

export const dynamic = "force-dynamic"

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="ds-field__label">{label}</p>
			<p className="ds-field__value">{value}</p>
		</div>
	)
}

export default async function InvoiceDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const invoice = await getInvoice(id)

	if (!invoice) {
		notFound()
	}

	const timeline = buildInvoiceTimeline(invoice)
	const payable = isPayable(invoice)
	const awaiting = invoice.status === "awaiting_payment"

	return (
		<>
			<PageHeader
				title={invoice.number}
				description={invoice.description}
				breadcrumbs={
					<ActionLink href="/account/financial/invoices" variant="secondary">
						{COPY.backToInvoices}
					</ActionLink>
				}
				actions={<StatusBadge status={invoice.status} />}
			/>

			<div className="ds-fin-stack">
				<Card title={COPY.amount}>
					<Amount piastres={invoice.amountPiastres} size="hero" />

					<div className="ds-fin-grid" style={{ marginTop: 24 }}>
						<Field
							label={COPY.createdAt}
							value={formatTimestamp(invoice.createdAt)}
						/>
						{invoice.expiresAt ? (
							<Field
								label={COPY.expiresAt}
								value={formatTimestamp(invoice.expiresAt)}
							/>
						) : null}
						<Field label={COPY.provider} value={invoice.provider} />
					</div>
				</Card>

				{/* The reference is only actionable while the invoice is unpaid. */}
				{awaiting && invoice.providerReference ? (
					<Card
						title={COPY.paymentReference}
						footer={
							payable && invoice.checkoutUrl ? (
								<ActionLink href={invoice.checkoutUrl} external>
									{COPY.continuePayment}
								</ActionLink>
							) : undefined
						}
					>
						<CopyField
							value={invoice.providerReference}
							label={COPY.copyReference}
						/>

						<div style={{ marginTop: 24 }}>
							<p className="ds-card__title" style={{ marginBottom: 12 }}>
								{COPY.howToPay}
							</p>
							<InstructionList
								steps={[
									COPY.payStep1,
									COPY.payStep2,
									COPY.payStep3,
									COPY.payStep4,
								]}
							/>
						</div>
					</Card>
				) : null}

				<Card title={COPY.processTimeline}>
					{/* Polled pages update this, so changes are announced. */}
					<Timeline steps={timeline} live={awaiting} />
				</Card>

				<AlertBand
					tone="info"
					title={COPY.needHelp}
					message={COPY.helpExplanation}
				/>
			</div>
		</>
	)
}
