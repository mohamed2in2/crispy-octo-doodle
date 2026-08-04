/**
 * The single data access point for the Financial Center.
 *
 * Every page reads through these functions and none of them touch a data source
 * directly. That matters because the invoice tables do not exist yet: today some
 * of these read a real endpoint and some return fixtures, and no page can tell
 * the difference. When the migration lands, only this file changes.
 *
 * Backend status of each function is stated in its own doc comment. Do not add
 * a fixture anywhere outside this file.
 */

import { cookies, headers } from "next/headers"

import type {
	InvoiceRecord,
	PaymentMethodSummary,
	ReceiptRecord,
	RefundRecord,
	WalletEntry,
	WalletSummary,
} from "./types"
import { projectInvoiceStatus } from "./status"

/* ------------------------------------------------------------------ wiring -- */

/**
 * Resolves the origin for server-side calls to this application's own API.
 *
 * Prefers the incoming request's host so that preview deployments and local
 * development work without configuration, and falls back to the same env vars
 * the existing payment code already reads.
 */
async function resolveOrigin(): Promise<string> {
	try {
		const headerList = await headers()
		const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
		if (host) {
			const protocol =
				headerList.get("x-forwarded-proto") ??
				(host.startsWith("localhost") || host.startsWith("127.0.0.1")
					? "http"
					: "https")
			return `${protocol}://${host}`
		}
	} catch {
		// Outside a request scope. Fall through to configuration.
	}

	return (
		process.env.NEXT_PUBLIC_APP_URL ??
		process.env.NEXT_PUBLIC_SITE_URL ??
		"https://code-up.tech"
	)
}

/** Forwards the caller's cookies so the API sees the signed-in student. */
async function authorizedFetch(path: string): Promise<Response | null> {
	try {
		const [origin, cookieStore] = await Promise.all([
			resolveOrigin(),
			cookies(),
		])

		const cookieHeader = cookieStore
			.getAll()
			.map((entry) => `${entry.name}=${entry.value}`)
			.join("; ")

		return await fetch(`${origin}${path}`, {
			headers: cookieHeader ? { cookie: cookieHeader } : undefined,
			// Financial figures must never be served from a cache.
			cache: "no-store",
		})
	} catch {
		return null
	}
}

/* ------------------------------------------------------------------ wallet -- */

/** Shape returned by the existing GET /api/student/balance endpoint. */
type BalanceApiTransaction = {
	id?: string | number
	amount?: number
	type?: string
	note?: string
	status?: string
	reference?: string
	url?: string
	createdAt?: string
}

type BalanceApiResponse = {
	balance?: number
	transactions?: BalanceApiTransaction[]
}

/**
 * Converts a value that may be stored in pounds into integer piastres.
 *
 * The existing schema's units are unconfirmed — `balanceTransaction.amount` has
 * not been verified as Int or Float. This performs the conversion in one place
 * so that if the column turns out to be pounds-as-float, the fix is here and
 * nowhere else. Rounding is half-up on the piastre, never truncating a student's
 * money downward.
 */
function toPiastres(value: number | undefined): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 0
	}
	return Math.round(value * 100)
}

/**
 * Wallet balance and ledger.
 *
 * BACKEND: live. Reads GET /api/student/balance.
 */
export async function getWalletSummary(): Promise<WalletSummary> {
	const response = await authorizedFetch("/api/student/balance")

	if (!response || !response.ok) {
		// A failed read must not render as a zero balance, which a student would
		// reasonably read as "my money is gone". The caller distinguishes an empty
		// ledger from an unavailable one by checking `entries.length` against this.
		return { balancePiastres: 0, pendingPiastres: 0, entries: [] }
	}

	let payload: BalanceApiResponse
	try {
		payload = (await response.json()) as BalanceApiResponse
	} catch {
		return { balancePiastres: 0, pendingPiastres: 0, entries: [] }
	}

	const rawEntries = Array.isArray(payload.transactions)
		? payload.transactions
		: []

	const entries: WalletEntry[] = rawEntries.map((row, index) => {
		const amount = toPiastres(row.amount)
		const type = typeof row.type === "string" ? row.type : ""
		const pending = type.toLowerCase().includes("pending")

		return {
			id: String(row.id ?? `entry-${index}`),
			direction: amount < 0 ? "debit" : "credit",
			amountPiastres: Math.abs(amount),
			pending,
			occurredAt: row.createdAt ?? "",
			description: row.note ?? "",
			reference: row.reference ?? null,
			checkoutUrl: row.url ?? null,
		}
	})

	const pendingPiastres = entries
		.filter((entry) => entry.pending && entry.direction === "credit")
		.reduce((total, entry) => total + entry.amountPiastres, 0)

	return {
		balancePiastres: toPiastres(payload.balance),
		pendingPiastres,
		entries: entries.filter((entry) => !entry.pending),
	}
}

/* ---------------------------------------------------------------- invoices -- */

/**
 * FIXTURE. There is no Invoice table yet.
 *
 * Blocked on the additive Prisma migration in spec section 4 phase 1. Once
 * `Invoice` and `PaymentEvent` exist, replace the body of `listInvoices` and
 * `getInvoice` with queries and delete this constant. Nothing else changes.
 */
const INVOICE_FIXTURES: ReadonlyArray<Omit<InvoiceRecord, "status">> = [
	{
		id: "inv_fixture_1",
		number: "INV-2026-0001",
		amountPiastres: 25000,
		provider: "shakeout",
		providerReference: "884213",
		createdAt: "2026-08-01T10:12:00.000Z",
		expiresAt: "2026-08-08T10:12:00.000Z",
		paidAt: null,
		checkoutUrl: null,
		// "\u0634\u062d\u0646 \u0627\u0644\u0645\u062d\u0641\u0638\u0629" - wallet top-up
		description: "\u0634\u062d\u0646 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
		events: [
			{
				id: "evt_1",
				kind: "invoice_created",
				occurredAt: "2026-08-01T10:12:00.000Z",
			},
			{
				id: "evt_2",
				kind: "payment_pending",
				occurredAt: "2026-08-01T10:12:04.000Z",
			},
		],
	},
	{
		id: "inv_fixture_2",
		number: "INV-2026-0002",
		amountPiastres: 50000,
		provider: "shakeout",
		providerReference: "884120",
		createdAt: "2026-07-24T08:03:00.000Z",
		expiresAt: null,
		paidAt: "2026-07-24T08:41:00.000Z",
		checkoutUrl: null,
		description: "\u0634\u062d\u0646 \u0627\u0644\u0645\u062d\u0641\u0638\u0629",
		events: [
			{
				id: "evt_3",
				kind: "invoice_created",
				occurredAt: "2026-07-24T08:03:00.000Z",
			},
			{
				id: "evt_4",
				kind: "payment_pending",
				occurredAt: "2026-07-24T08:03:05.000Z",
			},
			{
				id: "evt_5",
				kind: "provider_confirmed",
				occurredAt: "2026-07-24T08:41:00.000Z",
			},
			{
				id: "evt_6",
				kind: "wallet_credited",
				occurredAt: "2026-07-24T08:41:02.000Z",
			},
			{
				id: "evt_7",
				kind: "receipt_issued",
				occurredAt: "2026-07-24T08:41:03.000Z",
			},
		],
	},
]

/**
 * Status is projected from the event log rather than stored on the fixture, so
 * the projection function is exercised by the real pages.
 */
function withStatus(record: Omit<InvoiceRecord, "status">): InvoiceRecord {
	return { ...record, status: projectInvoiceStatus(record.events) }
}

/** BACKEND: fixture. Blocked on the Invoice table. */
export async function listInvoices(): Promise<ReadonlyArray<InvoiceRecord>> {
	return INVOICE_FIXTURES.map(withStatus)
}

/** BACKEND: fixture. Blocked on the Invoice table. */
export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
	const found = INVOICE_FIXTURES.find((record) => record.id === id)
	return found ? withStatus(found) : null
}

/* ---------------------------------------------------------------- receipts -- */

/** BACKEND: fixture. Blocked on the Receipt table. */
export async function listReceipts(): Promise<ReadonlyArray<ReceiptRecord>> {
	const invoices = await listInvoices()

	return invoices
		.filter((invoice) => invoice.status === "paid")
		.map((invoice, index) => ({
			id: `rcp_${invoice.id}`,
			number: `RCP-2026-${String(index + 1).padStart(4, "0")}`,
			invoiceId: invoice.id,
			invoiceNumber: invoice.number,
			amountPiastres: invoice.amountPiastres,
			issuedAt: invoice.paidAt ?? invoice.createdAt,
			description: invoice.description,
		}))
}

/* ----------------------------------------------------------------- refunds -- */

/** BACKEND: fixture. Blocked on the Refund table. */
export async function listRefunds(): Promise<ReadonlyArray<RefundRecord>> {
	return []
}

/* --------------------------------------------------------- payment methods -- */

/**
 * BACKEND: partial.
 *
 * The real catalogue lives in src/lib/payment-methods.ts. It is not imported
 * here yet because its export shape has not been verified against this type;
 * doing that is the first task when this file is next touched.
 */
export async function listPaymentMethods(): Promise<
	ReadonlyArray<PaymentMethodSummary>
> {
	return [
		{
			key: "shakeout",
			// "Shake-Out \u0645\u0646\u0627\u0641\u0630 \u0627\u0644\u062f\u0641\u0639" - Shake-Out payment outlets
			label: "Shake-Out \u0645\u0646\u0627\u0641\u0630 \u0627\u0644\u062f\u0641\u0639",
			provider: "shakeout",
			category: "kiosk",
			available: true,
			unavailableNote: null,
		},
		{
			key: "internal",
			// "\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0638\u0629" - wallet balance
			label: "\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0637\u0629",
			provider: "internal",
			category: "wallet",
			available: true,
			unavailableNote: null,
		},
	]
}
