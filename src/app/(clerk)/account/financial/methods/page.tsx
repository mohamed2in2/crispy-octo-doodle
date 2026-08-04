/**
 * Payment methods.
 *
 * Unavailable methods are shown rather than hidden, with the reason stated. A
 * method that silently disappears reads as a bug; one that says why it cannot be
 * used right now reads as a system that is working.
 */

import { Card } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { AlertBand } from "@/components/ui/AlertBand"
import { ActionLink } from "@/components/financial/ActionLink"
import { COPY } from "@/lib/financial/copy"
import { listPaymentMethods } from "@/lib/financial/data"

export const dynamic = "force-dynamic"

export default async function PaymentMethodsPage() {
	const methods = await listPaymentMethods()

	return (
		<>
			<PageHeader
				title={COPY.paymentMethods}
				description={COPY.paymentMethodsDescription}
			/>

			<div className="ds-fin-grid">
				{methods.map((method) => (
					<Card
						key={method.key}
						title={method.label}
						headerAction={
							method.available ? null : (
								<StatusBadge status="cancelled" />
							)
						}
						footer={
							method.available ? (
								<ActionLink href="/account">{COPY.topUp}</ActionLink>
							) : undefined
						}
					>
						<AlertBand
							tone="warning"
							message={
								method.available
									? undefined
									: (method.unavailableNote ?? COPY.unavailable)
							}
						/>
					</Card>
				))}
			</div>
		</>
	)
}
