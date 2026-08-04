/**
 * Invoice status projection and timeline construction.
 *
 * Pure functions over an event list. No database access, no React, no I/O, so
 * these are the parts of the payment system that can be reasoned about and
 * tested directly.
 */

import type { TimelineStep } from "@/components/ui/Timeline"
import type {
	InvoiceRecord,
	PaymentEventKind,
	PaymentEventRecord,
	PaymentStatus,
	RefundStatus,
} from "./types"

/**
 * Derives an invoice's status from its event log.
 *
 * Terminal events win regardless of order, because a settled refund after a
 * successful payment must not be masked by the earlier success. Among
 * non-terminal events the latest one decides.
 */
export function projectInvoiceStatus(
	events: ReadonlyArray<PaymentEventRecord>,
): PaymentStatus {
	if (events.length === 0) {
		return "awaiting_payment"
	}

	const kinds = new Set<PaymentEventKind>(events.map((event) => event.kind))

	// Checked in precedence order, most final first.
	if (kinds.has("refund_settled")) return "refunded"
	if (kinds.has("invoice_cancelled")) return "cancelled"
	if (kinds.has("payment_failed")) return "failed"
	if (kinds.has("provider_confirmed") || kinds.has("wallet_credited")) {
		return "paid"
	}
	// Expiry only matters if the invoice was never actually paid.
	if (kinds.has("invoice_expired")) return "expired"

	return "awaiting_payment"
}

/** True when the invoice can still be completed by the student. */
export function isPayable(invoice: InvoiceRecord): boolean {
	return invoice.status === "awaiting_payment" && invoice.checkoutUrl !== null
}

/** True when the student may ask for this invoice to be refunded. */
export function isRefundable(invoice: InvoiceRecord): boolean {
	return invoice.status === "paid"
}

const EVENT_LABEL: Record<PaymentEventKind, string> = {
	// "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629" - invoice created
	invoice_created: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629",
	// "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u0645\u0632\u0648\u062f \u0627\u0644\u062f\u0641\u0639" - request sent to provider
	provider_notified:
		"\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u0644\u0645\u0632\u0648\u062f \u0627\u0644\u062f\u0641\u0639",
	// "\u0628\u0627\u0646\u062a\u0637\u0627\u0631 \u0627\u0644\u062f\u0641\u0639" - awaiting payment
	payment_pending: "\u0628\u0627\u0646\u062a\u0637\u0627\u0631 \u0627\u0644\u062f\u0641\u0639",
	// "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639" - payment confirmed
	provider_confirmed: "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639",
	// "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u0635\u064a\u062f" - balance credited
	wallet_credited: "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0631\u0635\u064a\u062f",
	// "\u062a\u0645 \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0625\u064a\u0635\u0627\u0644" - receipt issued
	receipt_issued: "\u062a\u0645 \u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0625\u064a\u0635\u0627\u0644",
	// "\u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629" - invoice expired
	invoice_expired:
		"\u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u0629 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629",
	// "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629" - invoice cancelled
	invoice_cancelled: "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629",
	// "\u0641\u0634\u0644 \u0627\u0644\u062f\u0641\u0639" - payment failed
	payment_failed: "\u0641\u0634\u0644 \u0627\u0644\u062f\u0641\u0639",
	// "\u062a\u0645 \u0637\u0644\u0628 \u0627\u0633\u062a\u0631\u062f\u0627\u062f" - refund requested
	refund_requested: "\u062a\u0645 \u0637\u0644\u0628 \u0627\u0633\u062a\u0631\u062f\u0627\u062f",
	// "\u062a\u0645 \u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0627\u0644\u0645\u0628\u0644\u063a" - amount refunded
	refund_settled: "\u062a\u0645 \u0627\u0633\u062a\u0631\u062f\u0627\u062f \u0627\u0644\u0645\u0628\u0644\u063a",
}

/** The label for an event kind, for reuse in notifications and exports. */
export function eventLabel(kind: PaymentEventKind): string {
	return EVENT_LABEL[kind]
}

/**
 * The steps a normal successful top-up passes through, in order.
 *
 * Used to render the steps that have not happened yet. Showing a student that
 * "balance credited" is still ahead of them is what makes a pending invoice read
 * as in-progress rather than broken.
 */
const HAPPY_PATH: ReadonlyArray<PaymentEventKind> = [
	"invoice_created",
	"payment_pending",
	"provider_confirmed",
	"wallet_credited",
	"receipt_issued",
]

const DATE_FORMAT = new Intl.DateTimeFormat("ar-EG", {
	dateStyle: "medium",
	timeStyle: "short",
})

/** Formats an ISO timestamp for display, tolerating unparseable input. */
export function formatTimestamp(iso: string | null): string {
	if (!iso) return ""

	const parsed = new Date(iso)
	if (Number.isNaN(parsed.getTime())) {
		return ""
	}

	return DATE_FORMAT.format(parsed)
}

/**
 * Builds the timeline for an invoice: what has happened, then what has not.
 *
 * Recorded events come first in chronological order. Remaining happy-path steps
 * are then appended as `future`, unless the invoice reached a terminal failure,
 * in which case there is no future to promise.
 */
export function buildInvoiceTimeline(
	invoice: InvoiceRecord,
): ReadonlyArray<TimelineStep> {
	const ordered = [...invoice.events].sort(
		(left, right) =>
			new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
	)

	const isFailure =
		invoice.status === "failed" ||
		invoice.status === "cancelled" ||
		invoice.status === "expired"

	const steps: TimelineStep[] = ordered.map((event, index) => {
		const isLast = index === ordered.length - 1
		const failed =
			event.kind === "payment_failed" ||
			event.kind === "invoice_cancelled" ||
			event.kind === "invoice_expired"

		let state: TimelineStep["state"] = "done"
		if (failed) {
			state = "failed"
		} else if (isLast && invoice.status === "awaiting_payment") {
			state = "current"
		}

		return {
			label: EVENT_LABEL[event.kind],
			state,
			meta: event.detail
				? `${formatTimestamp(event.occurredAt)} \u00b7 ${event.detail}`
				: formatTimestamp(event.occurredAt),
		}
	})

	if (isFailure || invoice.status === "refunded") {
		return steps
	}

	const recorded = new Set(ordered.map((event) => event.kind))
	for (const kind of HAPPY_PATH) {
		if (!recorded.has(kind)) {
			steps.push({ label: EVENT_LABEL[kind], state: "future" })
		}
	}

	return steps
}

const REFUND_LABEL: Record<RefundStatus, string> = {
	// "\u0642\u064a\u062f \u0627\u0644\u0637\u0644\u0628" - requested
	requested: "\u0642\u064a\u062f \u0627\u0644\u0637\u0644\u0628",
	// "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629" - under review
	under_review: "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
	// "\u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629" - approved
	approved: "\u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629",
	// "\u0645\u0631\u0641\u0648\u0636" - rejected
	rejected: "\u0645\u0631\u0641\u0648\u0636",
	// "\u062a\u0645 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f" - settled
	settled: "\u062a\u0645 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f",
}

export function refundLabel(status: RefundStatus): string {
	return REFUND_LABEL[status]
}
