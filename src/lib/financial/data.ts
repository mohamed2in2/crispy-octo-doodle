/**
 * The single data access point for the Financial Center.
 *
 * Wallet data remains on the legacy endpoint during the dual-write migration.
 * Invoice, receipt, and refund reads use the additive persistence tables and
 * are always scoped to the signed-in student.
 */

import { cookies, headers } from "next/headers"

import type {
	PaymentMethodSummary,
	ReceiptRecord,
	RefundRecord,
	WalletEntry,
	WalletSummary,
	InvoiceRecord,
} from "./types"
import { poundsToPiastres } from "./money"
import {
	getPersistedInvoice,
	listPersistedInvoices,
	listPersistedReceipts,
	listPersistedRefunds,
} from "./invoice-read-model"

async function resolveOrigin(): Promise<string> {
	try {
		const headerList = await headers()
		const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
		if (host) {
			const protocol = headerList.get("x-forwarded-proto") ??
				(host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")
			return `${protocol}://${host}`
		}
	} catch {
		// Fall through outside a request scope.
	}
	return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://code-up.tech"
}

async function authorizedFetch(path: string): Promise<Response | null> {
	try {
		const [origin, cookieStore] = await Promise.all([resolveOrigin(), cookies()])
		const cookieHeader = cookieStore.getAll().map((entry) => `${entry.name}=${entry.value}`).join("; ")
		return await fetch(`${origin}${path}`, { headers: cookieHeader ? { cookie: cookieHeader } : undefined, cache: "no-store" })
	} catch {
		return null
	}
}

type BalanceApiTransaction = { id?: string | number; amount?: number; type?: string; note?: string; status?: string; reference?: string; url?: string; createdAt?: string }
type BalanceApiResponse = { balance?: number; transactions?: BalanceApiTransaction[] }

/** Wallet balance and ledger still read the production legacy endpoint. */
export async function getWalletSummary(): Promise<WalletSummary> {
	const response = await authorizedFetch("/api/student/balance")
	if (!response || !response.ok) return { balancePiastres: 0, pendingPiastres: 0, entries: [] }
	let payload: BalanceApiResponse
	try { payload = (await response.json()) as BalanceApiResponse } catch { return { balancePiastres: 0, pendingPiastres: 0, entries: [] } }
	const entries: WalletEntry[] = (Array.isArray(payload.transactions) ? payload.transactions : []).map((row, index) => {
		const amount = poundsToPiastres(row.amount)
		const pending = (row.type ?? "").toLowerCase().includes("pending")
		return { id: String(row.id ?? `entry-${index}`), direction: amount < 0 ? "debit" : "credit", amountPiastres: Math.abs(amount), pending, occurredAt: row.createdAt ?? "", description: row.note ?? "", reference: row.reference ?? null, checkoutUrl: row.url ?? null }
	})
	return { balancePiastres: poundsToPiastres(payload.balance), pendingPiastres: entries.filter((entry) => entry.pending && entry.direction === "credit").reduce((total, entry) => total + entry.amountPiastres, 0), entries: entries.filter((entry) => !entry.pending) }
}

/** Persisted invoices, scoped in the read model to the signed-in student. */
export async function listInvoices(): Promise<ReadonlyArray<InvoiceRecord>> {
	try { return await listPersistedInvoices() } catch { return [] }
}

/** A persisted invoice, or null when it is not owned by the current student. */
export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
	try { return await getPersistedInvoice(id) } catch { return null }
}

/** Receipts are only returned for invoices owned by the signed-in student. */
export async function listReceipts(): Promise<ReadonlyArray<ReceiptRecord>> {
	try { return await listPersistedReceipts() } catch { return [] }
}

/** Refund requests are only returned for invoices owned by the signed-in student. */
export async function listRefunds(): Promise<ReadonlyArray<RefundRecord>> {
	try { return await listPersistedRefunds() } catch { return [] }
}

/** The real provider catalogue is intentionally kept separate from invoice history. */
export async function listPaymentMethods(): Promise<ReadonlyArray<PaymentMethodSummary>> {
	return [
		{ key: "shakeout", label: "Shake-Out منافذ الدفع", provider: "shakeout", category: "kiosk", available: true, unavailableNote: null },
		{ key: "internal", label: "رصيد المحفظة", provider: "internal", category: "wallet", available: true, unavailableNote: null },
	]
}
