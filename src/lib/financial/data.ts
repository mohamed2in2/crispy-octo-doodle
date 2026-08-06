/**
 * The single data access point for the Financial Center.
 *
 * Wallet balance and ledger read directly from Prisma scoped to the signed-in
 * user to avoid HTTP loopback network failures during SSR.
 */

import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

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

/** Wallet balance and ledger read directly from Prisma for signed-in user. */
export async function getWalletSummary(): Promise<WalletSummary> {
	try {
		const session = await getSession()
		if (!session) return { balancePiastres: 0, pendingPiastres: 0, entries: [] }

		const [user, rawTransactions] = await Promise.all([
			prisma.user.findUnique({ where: { id: session.id }, select: { balance: true } }),
			prisma.balanceTransaction.findMany({
				where: { userId: session.id },
				orderBy: { createdAt: "desc" },
				take: 50,
				select: { id: true, type: true, amount: true, note: true, createdAt: true },
			}),
		])

		const balancePiastres = poundsToPiastres(user?.balance ?? 0)

		const entries: WalletEntry[] = rawTransactions.map((row, index) => {
			const amount = poundsToPiastres(row.amount)
			const pending = (row.type ?? "").toLowerCase().includes("pending")
			return {
				id: String(row.id ?? `entry-${index}`),
				direction: amount < 0 ? "debit" : "credit",
				amountPiastres: Math.abs(amount),
				pending,
				occurredAt: row.createdAt ? row.createdAt.toISOString() : "",
				description: row.note ?? "",
				reference: null,
				checkoutUrl: null,
			}
		})

		return {
			balancePiastres,
			pendingPiastres: entries
				.filter((entry) => entry.pending && entry.direction === "credit")
				.reduce((total, entry) => total + entry.amountPiastres, 0),
			entries: entries.filter((entry) => !entry.pending),
		}
	} catch {
		return { balancePiastres: 0, pendingPiastres: 0, entries: [] }
	}
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
