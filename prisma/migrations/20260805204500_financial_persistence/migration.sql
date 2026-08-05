-- Additive financial persistence. Existing wallet Float columns and balance
-- transactions remain untouched during the dual-write migration period.
-- All new amounts are integer piastres.

CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "courseId" TEXT,
  "planId" TEXT,
  "subtotal" INTEGER NOT NULL,
  "tax" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "provider" TEXT,
  "methodKey" TEXT,
  "providerInvoiceId" TEXT,
  "providerRef" TEXT,
  "checkoutUrl" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE UNIQUE INDEX "Invoice_provider_providerInvoiceId_key" ON "Invoice"("provider", "providerInvoiceId");
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");
CREATE INDEX "Invoice_status_expiresAt_idx" ON "Invoice"("status", "expiresAt");
CREATE INDEX "Invoice_providerRef_idx" ON "Invoice"("providerRef");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "methodKey" TEXT,
  "providerTxId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "succeededAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "Payment_provider_providerTxId_key" ON "Payment"("provider", "providerTxId");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "paymentId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'system',
  "actorId" TEXT,
  "payload" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL
);
CREATE INDEX "PaymentEvent_invoiceId_createdAt_idx" ON "PaymentEvent"("invoiceId", "createdAt");

CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pdfUrl" TEXT,
  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "Receipt_invoiceId_key" ON "Receipt"("invoiceId");
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");
CREATE INDEX "Receipt_invoiceId_idx" ON "Receipt"("invoiceId");

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "reason" TEXT,
  "decisionNote" TEXT,
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "destination" TEXT NOT NULL DEFAULT 'wallet',
  "providerRefundId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT,
  CONSTRAINT "Refund_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "Refund_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX "Refund_invoiceId_idx" ON "Refund"("invoiceId");
CREATE INDEX "Refund_status_createdAt_idx" ON "Refund"("status", "createdAt");

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "eventType" TEXT,
  "rawBody" TEXT NOT NULL,
  "headers" TEXT,
  "signatureValid" BOOLEAN,
  "status" TEXT NOT NULL DEFAULT 'received',
  "processingError" TEXT,
  "invoiceId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebhookEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "WebhookEvent_provider_dedupeKey_key" ON "WebhookEvent"("provider", "dedupeKey");
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");
