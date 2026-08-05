import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { poundsToPiastres } from "./money";

type Provider = "shakeout" | "sha7nawy";

type CheckoutInput = {
  userId: string;
  provider: Provider;
  reference: string;
  methodKey: string;
  totalPounds: number;
  subtotalPounds: number;
  taxPounds: number;
  checkoutUrl: string | null;
  purpose: string;
};

type SettlementInput = {
  provider: Provider;
  reference: string;
  transactionId: string;
  totalPounds: number;
};

function invoiceNumber() {
  return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function receiptNumber() {
  return `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Records the new durable financial projection without changing the existing
 * balance-transaction checkout path. Failures are intentionally non-blocking
 * until the migration is deployed everywhere and dual-write reconciliation is
 * complete; the legacy payment flow remains the operational source of truth.
 */
export async function persistProviderCheckout(input: CheckoutInput): Promise<void> {
  const subtotal = poundsToPiastres(input.subtotalPounds);
  const tax = poundsToPiastres(input.taxPounds);
  const total = poundsToPiastres(input.totalPounds);
  if (!input.reference || total <= 0 || subtotal < 0 || tax < 0) return;

  try {
    const invoiceId = randomUUID();
    const paymentId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "Invoice" ("id", "number", "userId", "purpose", "subtotal", "tax", "total", "currency", "status", "provider", "methodKey", "providerInvoiceId", "providerRef", "checkoutUrl", "createdAt", "updatedAt")
        VALUES (${invoiceId}, ${invoiceNumber()}, ${input.userId}, ${input.purpose}, ${subtotal}, ${tax}, ${total}, 'EGP', 'awaiting_payment', ${input.provider}, ${input.methodKey}, ${input.reference}, ${input.reference}, ${input.checkoutUrl}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await tx.$executeRaw`
        INSERT INTO "Payment" ("id", "invoiceId", "amount", "currency", "status", "provider", "methodKey", "createdAt")
        VALUES (${paymentId}, ${invoiceId}, ${total}, 'EGP', 'pending', ${input.provider}, ${input.methodKey}, CURRENT_TIMESTAMP)
      `;
      await tx.$executeRaw`
        INSERT INTO "PaymentEvent" ("id", "invoiceId", "paymentId", "type", "message", "actorType", "createdAt")
        VALUES (${randomUUID()}, ${invoiceId}, ${paymentId}, 'invoice.created', 'Checkout created with provider', 'system', CURRENT_TIMESTAMP),
               (${randomUUID()}, ${invoiceId}, ${paymentId}, 'provider.pending', 'Awaiting provider confirmation', 'system', CURRENT_TIMESTAMP)
      `;
    });
  } catch (error) {
    console.error("[financial] checkout dual-write failed", error);
  }
}

/** Records a verified provider settlement and issues an idempotent receipt. */
export async function persistProviderSettlement(input: SettlementInput): Promise<boolean> {
  const total = poundsToPiastres(input.totalPounds);
  if (!input.reference || !input.transactionId || total <= 0) return false;

  try {
    return await prisma.$transaction(async (tx) => {
      const invoices = await tx.$queryRaw<Array<{ id: string; number: string }>>`
        UPDATE "Invoice"
        SET "status" = 'paid', "paidAt" = CURRENT_TIMESTAMP, "providerInvoiceId" = ${input.transactionId}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "provider" = ${input.provider} AND "providerRef" = ${input.reference} AND "total" = ${total} AND "status" <> 'paid'
        RETURNING "id", "number"
      `;
      const invoice = invoices[0];
      if (!invoice) return false;

      const payments = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "Payment"
        SET "status" = 'succeeded', "providerTxId" = ${input.transactionId}, "succeededAt" = CURRENT_TIMESTAMP
        WHERE "invoiceId" = ${invoice.id} AND "status" <> 'succeeded'
        RETURNING "id"
      `;
      const paymentId = payments[0]?.id ?? null;

      await tx.$executeRaw`
        INSERT INTO "PaymentEvent" ("id", "invoiceId", "paymentId", "type", "message", "actorType", "createdAt")
        VALUES (${randomUUID()}, ${invoice.id}, ${paymentId}, 'payment.succeeded', 'Provider payment verified', 'provider', CURRENT_TIMESTAMP),
               (${randomUUID()}, ${invoice.id}, ${paymentId}, 'wallet.credited', 'Legacy wallet credit completed', 'system', CURRENT_TIMESTAMP)
      `;

      const receiptCreated = await tx.$executeRaw`
        INSERT INTO "Receipt" ("id", "invoiceId", "number", "snapshot", "total", "issuedAt")
        VALUES (${randomUUID()}, ${invoice.id}, ${receiptNumber()}, ${JSON.stringify({ invoiceNumber: invoice.number, provider: input.provider, providerReference: input.reference, transactionId: input.transactionId })}, ${total}, CURRENT_TIMESTAMP)
        ON CONFLICT ("invoiceId") DO NOTHING
      `;
      if (receiptCreated > 0) {
        await tx.$executeRaw`
          INSERT INTO "PaymentEvent" ("id", "invoiceId", "paymentId", "type", "message", "actorType", "createdAt")
          VALUES (${randomUUID()}, ${invoice.id}, ${paymentId}, 'receipt.issued', 'Receipt issued', 'system', CURRENT_TIMESTAMP)
        `;
      }
      return true;
    });
  } catch (error) {
    console.error("[financial] settlement dual-write failed", error);
    return false;
  }
}
