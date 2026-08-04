/**
 * Financial domain types.
 *
 * These mirror the Prisma models in docs/PAYMENT-CENTER-SPEC.md section 3. They
 * are declared independently of Prisma so that the UI layer can be built and
 * reviewed before the migration lands, and so that pure functions over them
 * stay testable without a database.
 *
 * Money is always an integer count of piastres. There is no float anywhere in
 * this file and there must never be one.
 */

import type { PaymentStatus } from "@/components/ui/StatusBadge"

export type { PaymentStatus }

/** Matches the existing PaymentProvider union in src/lib/payment-methods.ts. */
export type PaymentProviderKey = "shakeout" | "sha7nawy" | "internal" | "bank"

/**
 * The append-only event log for an invoice.
 *
 * The current schema mutates a single row in place, which destroys the history
 * and makes a timeline impossible to render. These events are the fix: nothing
 * is ever updated, only appended, and the invoice's status is a projection over
 * them rather than a stored truth.
 */
export type PaymentEventKind =
	| "invoice_created"
	| "provider_notified"
	| "payment_pending"
	| "provider_confirmed"
	| "wallet_credited"
	| "receipt_issued"
	| "invoice_expired"
	| "invoice_cancelled"
	| "payment_failed"
	| "refund_requested"
	| "refund_settled"

export type PaymentEventRecord = {
	id: string
	kind: PaymentEventKind
	/** ISO-8601. */
	occurredAt: string
	/** Human-readable detail, shown beneath the timeline label. */
	detail?: string
}

export type InvoiceRecord = {
	id: string
	/** Human-facing number, e.g. INV-2026-0001. Never the database id. */
	number: string
	status: PaymentStatus
	amountPiastres: number
	provider: PaymentProviderKey
	/** The reference the student quotes at the kiosk. Null until issued. */
	providerReference: string | null
	createdAt: string
	expiresAt: string | null
	paidAt: string | null
	/** Where an unpaid invoice can be completed. Null once settled. */
	checkoutUrl: string | null
	/** What the student is buying, in Arabic. */
	description: string
	events: ReadonlyArray<PaymentEventRecord>
}

export type ReceiptRecord = {
	id: string
	/** e.g. RCP-2026-0001. */
	number: string
	invoiceId: string
	invoiceNumber: string
	amountPiastres: number
	issuedAt: string
	description: string
}

export type RefundStatus =
	| "requested"
	| "under_review"
	| "approved"
	| "rejected"
	| "settled"

export type RefundRecord = {
	id: string
	invoiceId: string
	invoiceNumber: string
	amountPiastres: number
	status: RefundStatus
	requestedAt: string
	resolvedAt: string | null
	/** The student's stated reason. */
	reason: string
	/** Staff response, once there is one. */
	resolutionNote: string | null
}

/**
 * One line of the wallet ledger.
 *
 * `direction` is derived rather than inferred from the sign of the amount, so a
 * zero-value correction entry still renders correctly.
 */
export type WalletEntry = {
	id: string
	direction: "credit" | "debit"
	amountPiastres: number
	pending: boolean
	occurredAt: string
	description: string
	/** Set when this entry came from a provider payment. */
	reference: string | null
	/** Set when an unpaid entry can still be completed. */
	checkoutUrl: string | null
}

export type WalletSummary = {
	balancePiastres: number
	/** Sum of invoices awaiting payment. Not part of the balance. */
	pendingPiastres: number
	entries: ReadonlyArray<WalletEntry>
}

export type PaymentMethodSummary = {
	key: string
	label: string
	provider: PaymentProviderKey
	/** e.g. kiosk, wallet, card. */
	category: string
	available: boolean
	/** Why it cannot be used right now, when unavailable. */
	unavailableNote: string | null
}
