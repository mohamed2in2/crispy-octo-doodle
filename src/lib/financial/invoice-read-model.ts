import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import type {
  InvoiceRecord,
  PaymentEventKind,
  PaymentEventRecord,
  PaymentProviderKey,
  ReceiptRecord,
  RefundRecord,
  RefundStatus,
} from "./types"

type InvoiceRow = {
  id: string; number: string; purpose: string; total: number; provider: string | null;
  providerRef: string | null; createdAt: Date; expiresAt: Date | null; paidAt: Date | null;
  checkoutUrl: string | null; status: string
}
type EventRow = { id: string; type: string; message: string | null; createdAt: Date }
type ReceiptRow = { id: string; number: string; invoiceId: string; invoiceNumber: string; total: number; issuedAt: Date; purpose: string }
type RefundRow = { id: string; invoiceId: string; invoiceNumber: string; amount: number; status: string; createdAt: Date; reviewedAt: Date | null; completedAt: Date | null; reason: string | null; decisionNote: string | null }

const PROVIDERS = new Set<PaymentProviderKey>(["shakeout", "sha7nawy", "internal", "bank"])
const EVENT_KINDS: Record<string, PaymentEventKind> = {
  "invoice.created": "invoice_created", "checkout.opened": "provider_notified",
  "provider.pending": "payment_pending", "payment.succeeded": "provider_confirmed",
  "wallet.credited": "wallet_credited", "receipt.issued": "receipt_issued",
  "invoice.expired": "invoice_expired", "invoice.cancelled": "invoice_cancelled",
  "payment.failed": "payment_failed", "refund.requested": "refund_requested",
  "refund.completed": "refund_settled",
}

function provider(value: string | null): PaymentProviderKey { return PROVIDERS.has(value as PaymentProviderKey) ? value as PaymentProviderKey : "internal" }
function iso(value: Date | null): string | null { return value?.toISOString() ?? null }
function event(row: EventRow): PaymentEventRecord {
  return { id: row.id, kind: EVENT_KINDS[row.type] ?? "payment_pending", occurredAt: row.createdAt.toISOString(), detail: row.message ?? undefined }
}
function invoice(row: InvoiceRow, events: PaymentEventRecord[]): InvoiceRecord {
  const status = row.status === "paid" || row.status === "refunded" || row.status === "expired" || row.status === "cancelled" || row.status === "failed" ? row.status : "awaiting_payment"
  return { id: row.id, number: row.number, status, amountPiastres: row.total, provider: provider(row.provider), providerReference: row.providerRef, createdAt: row.createdAt.toISOString(), expiresAt: iso(row.expiresAt), paidAt: iso(row.paidAt), checkoutUrl: row.checkoutUrl, description: row.purpose, events }
}

async function studentId(): Promise<string | null> {
  const session = await getSession()
  return session?.role === "student" ? session.id : null
}

export async function listPersistedInvoices(): Promise<ReadonlyArray<InvoiceRecord>> {
  const userId = await studentId(); if (!userId) return []
  const rows = await prisma.$queryRaw<InvoiceRow[]>`SELECT "id", "number", "purpose", "total", "provider", "providerRef", "createdAt", "expiresAt", "paidAt", "checkoutUrl", "status" FROM "Invoice" WHERE "userId"=${userId} ORDER BY "createdAt" DESC`
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const events = await prisma.$queryRaw<Array<EventRow & { invoiceId: string }>>`SELECT "id", "invoiceId", "type", "message", "createdAt" FROM "PaymentEvent" WHERE "invoiceId" = ANY(${ids}::text[]) ORDER BY "createdAt" ASC`
  const byInvoice = new Map<string, PaymentEventRecord[]>(); for (const row of events) byInvoice.set(row.invoiceId, [...(byInvoice.get(row.invoiceId) ?? []), event(row)])
  return rows.map((row) => invoice(row, byInvoice.get(row.id) ?? []))
}

export async function getPersistedInvoice(id: string): Promise<InvoiceRecord | null> {
  const userId = await studentId(); if (!userId) return null
  const rows = await prisma.$queryRaw<InvoiceRow[]>`SELECT "id", "number", "purpose", "total", "provider", "providerRef", "createdAt", "expiresAt", "paidAt", "checkoutUrl", "status" FROM "Invoice" WHERE "id"=${id} AND "userId"=${userId} LIMIT 1`
  const row = rows[0]; if (!row) return null
  const events = await prisma.$queryRaw<EventRow[]>`SELECT "id", "type", "message", "createdAt" FROM "PaymentEvent" WHERE "invoiceId"=${id} ORDER BY "createdAt" ASC`
  return invoice(row, events.map(event))
}

export async function listPersistedReceipts(): Promise<ReadonlyArray<ReceiptRecord>> {
  const userId = await studentId(); if (!userId) return []
  const rows = await prisma.$queryRaw<ReceiptRow[]>`SELECT r."id", r."number", r."invoiceId", i."number" AS "invoiceNumber", r."total", r."issuedAt", i."purpose" FROM "Receipt" r JOIN "Invoice" i ON i."id"=r."invoiceId" WHERE i."userId"=${userId} ORDER BY r."issuedAt" DESC`
  return rows.map((row) => ({ id: row.id, number: row.number, invoiceId: row.invoiceId, invoiceNumber: row.invoiceNumber, amountPiastres: row.total, issuedAt: row.issuedAt.toISOString(), description: row.purpose }))
}

export async function listPersistedRefunds(): Promise<ReadonlyArray<RefundRecord>> {
  const userId = await studentId(); if (!userId) return []
  const rows = await prisma.$queryRaw<RefundRow[]>`SELECT r."id", r."invoiceId", i."number" AS "invoiceNumber", r."amount", r."status", r."createdAt", r."reviewedAt", r."completedAt", r."reason", r."decisionNote" FROM "Refund" r JOIN "Invoice" i ON i."id"=r."invoiceId" WHERE i."userId"=${userId} ORDER BY r."createdAt" DESC`
  return rows.map((row) => ({ id: row.id, invoiceId: row.invoiceId, invoiceNumber: row.invoiceNumber, amountPiastres: row.amount, status: ({ requested: "requested", processing: "under_review", approved: "approved", rejected: "rejected", completed: "settled" }[row.status] ?? "under_review") as RefundStatus, requestedAt: row.createdAt.toISOString(), resolvedAt: iso(row.completedAt ?? row.reviewedAt), reason: row.reason ?? "", resolutionNote: row.decisionNote }))
}
