# Payment Center — Specification

> Scope of this document: the Financial Center only. It deliberately does not
> specify the other 25 pages. The design tokens and component contracts defined
> here are intended to be inherited by every later page, so this is the
> foundation, not a silo.

## 0. Honesty about sources

Before anything else, what this document is and is not built on:

- **I never saw the competitor screenshots.** They were described to me, not
  shown. Every claim about the competitor in this document is a restatement of
  what was described, not an independent observation. I cannot verify it.
- **I did read the payment code.** Everything in sections 1-3 comes from reading
  the following files on `main` at `77829d0`:
  - `src/lib/shakeout.ts`
  - `src/lib/payment-methods.ts` (partially, via search)
  - `src/app/api/payments/shakeout/webhook/route.ts`
  - `src/app/api/student/balance/route.ts`
  - `mistakes.md` (via search excerpts)
- **I did not read** `prisma/schema.prisma`, `src/lib/sha7nawy.ts`,
  `src/app/api/payments/sha7nawy/*`, `src/app/api/payments/methods/*`, or
  `src/app/(clerk)/account/page.tsx` beyond one search fragment. Where a claim
  depends on those, it is marked **UNVERIFIED**.
- **Nothing here has been executed, built, or type-checked.**

The design guidance in sections 4-8 is judgement and is genuinely arguable. The
findings in sections 1-3 are facts about the code and are not.

---

## 1. P0 — Stop and read this first

This was found while reading the code for the data-model section. It is not a
design issue and it should be fixed before any redesign work starts.

### 1.1 The Shake-Out webhook credits wallets based on attacker-supplied status

`src/app/api/payments/shakeout/webhook/route.ts` does the following:

```ts
const status = transaction.status || req.headers.get("x-transaction-status") || payload.status;
// ...
const isCompleted = status === "completed" || status === "success" || status === "paid";
if (!isCompleted) { /* reject */ }
```

`status` comes from the **request body**. There is no signature check, no shared
secret, no IP allowlist, and no timestamp check anywhere in the handler.

The route does then call the provider to verify:

```ts
verified = await getShakeOutPaymentInfo(transactionId);
if (!verified.status || !verified.data) { /* reject */ }

const verifiedData = verified.data;
const verifiedReference = verifiedData.reference ? String(verifiedData.reference) : null;
```

And this is where it breaks. Look at what `verified.status` actually means in
`src/lib/shakeout.ts`:

```ts
return {
  status: data.status === "success",   // <- did the API CALL succeed
  code: res.status,
  data: {
    status: invData.invoice_status || "unknown",   // <- is the invoice PAID
    // ...
  },
};
```

`verified.status` is *"the lookup call worked"*. The authoritative payment state
is `verified.data.status`.

**`verified.data.status` is never compared to anything.** `verifiedData` is used
only to compute `verifiedReference`, and `verifiedReference` is then never used
again — it is a dead variable. The server-side verification confirms only that
**the invoice exists**, never that it was paid.

### 1.2 The resulting exploit

1. Attacker legitimately starts a top-up for any amount (e.g. 5000 EGP). A real
   pending `balanceTransaction` row and a real Shake-Out invoice are created.
2. Attacker does not pay.
3. Attacker sends `POST /api/payments/shakeout/webhook` with
   `{"event":"transaction.updated","transaction":{"status":"paid","id":"<their real invoice id>","reference":"<their real ref>"}}`.
4. `isCompleted` is true. The verification lookup succeeds because the invoice
   is real. The pending row is found, flipped to credited, and
   `user.balance` is incremented.

Free wallet balance, unauthenticated, from any machine on the internet. The
endpoint is a public route with no auth by design, as webhooks must be.

### 1.3 The fix

Two changes, both required:

```ts
// 1. Trust only the provider's own state, never the request body.
const providerStatus = String(verifiedData.status || "").toLowerCase();
const providerSaysPaid =
  providerStatus === "paid" ||
  providerStatus === "completed" ||
  providerStatus === "success";

if (!providerSaysPaid) {
  return NextResponse.json(
    { success: true, processed: false, reason: `Provider status is ${providerStatus}` },
    { status: 200 }
  );
}

// 2. Confirm the verified invoice is the one being claimed.
if (verifiedReference && verifiedReference.split("/")[0] !== searchRef) {
  return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
}
```

The exact allowed values of `invoice_status` must be confirmed against
Shake-Out's documentation before merging — the list above is inferred from the
strings the codebase already treats as success elsewhere, which is **not** the
same as knowing the provider's vocabulary. If `invoice_status` returns something
like `"PAID"` or `"1"`, the lowercase comparison above silently rejects every
real payment, which is a safe failure but still an outage.

Add webhook signature verification as well, if Shake-Out offers it. Provider
verification is a good mitigation but it should not be the only one.

### 1.4 Second finding — substring matching can credit the wrong user

Same file:

```ts
const searchRef = String(reference || transactionId || "").split("/")[0];

const pendingTx = await prisma.balanceTransaction.findFirst({
  where: { type: SHAKEOUT_PENDING_TYPE, note: { contains: searchRef } },
  select: { id: true, userId: true, amount: true },
});
```

Three problems compounding:

1. `contains` is a substring match, so ref `123` matches a note containing
   `shakeout_ref:1234`.
2. The query is **not scoped by user**. It searches every pending transaction in
   the table.
3. `findFirst` has no `orderBy`, so which row wins is undefined.

So a short or prefix-colliding reference can find a *different student's*
pending top-up and credit that student instead — `pendingTx.userId` and
`pendingTx.amount` both come from the matched row. Money lands in the wrong
account and the real payer sees nothing.

This is the same defect class already documented in `mistakes.md`, which records
an outage caused by an exact-string match on this same `note` field. The fix
then was to loosen the match to `contains`. That traded a missed-credit bug for
a mis-credit bug. **Neither is fixable while the reference lives inside prose.**
That is the argument for section 2.

---

## 2. Why the data model has to come first

The request was for a Payment Center with invoices, receipts, refunds, a payment
timeline, webhook status, and expired invoices. **None of those are
representable in the current schema.** Not "hard" — not representable.

### 2.1 There is no invoice entity

The entire payment system is stored as rows in `balanceTransaction`, where:

- **State is encoded in a string column.** `type` is
  `"credit_shakeout_pending"` before payment and `"credit_shakeout_wallet"`
  after. From `src/lib/shakeout.ts`:
  ```ts
  export const SHAKEOUT_PENDING_TYPE = "credit_shakeout_pending";
  export const SHAKEOUT_CREDITED_TYPE = "credit_shakeout_wallet";
  ```
- **Structured data is concatenated into a free-text field.**
  ```ts
  export function shakeOutRefNote(reference: string): string {
    return `shakeout_ref:${reference}`;
  }
  ```
- **And parsed back out with regexes.** From `src/app/api/student/balance/route.ts`:
  ```ts
  const urlMatch = tx.note.match(/\|url:(https?:\/\/[^\s|]+)/);
  const refMatch = tx.note.match(/(?:shakeout_ref|sha7nawy_ref):([^\s|]+)/);
  ```

The provider reference and the checkout URL are load-bearing production data
stored in a human-readable comment field.

### 2.2 The payment timeline is impossible today

The requested timeline is `Created -> Pending -> Confirmed -> Balance Updated ->
Receipt Generated`. The webhook implements the state change like this:

```ts
const claim = await tx.balanceTransaction.updateMany({
  where: { id: pendingTx.id, type: SHAKEOUT_PENDING_TYPE },
  data: {
    type: SHAKEOUT_CREDITED_TYPE,
    note: `${shakeOutRefNote(String(reference))} — شحن محفظة عبر Shake-Out`,
  },
});
```

The pending state is **overwritten in place**. Afterwards:

- There is no record that the row was ever pending.
- There is no `paidAt`. `createdAt` is still invoice-creation time, so "paid at"
  is unknowable.
- The `|url:` segment in `note` is destroyed by the overwrite, so the checkout
  URL is lost on success.
- No webhook payload is retained, so a disputed payment cannot be investigated.

A timeline UI cannot be built over data that deletes its own history. This is
the single strongest reason to do the model before the UI.

### 2.3 Status is derived by sniffing a substring

```ts
const isPending = tx.type.toLowerCase().includes("pending");
// ...
status: isPending ? "UNPAID" : "PAID",
```

Status is binary. There is no `failed`, `expired`, `cancelled`, `refunded`, or
`under_review`. The requested "expired invoices", "refund requests" and
"webhook status" have nowhere to live. And any future type string containing the
substring `pending` is silently classified as unpaid.

Also note the credited type is `credit_shakeout_wallet` — it does **not**
contain `pending`, so it reads as PAID. That works, but it is a naming
coincidence holding up the financial UI.

### 2.4 Amount precision — UNVERIFIED

I did not read `schema.prisma`, so I do not know the type of
`balanceTransaction.amount` or `user.balance`. If either is `Float`, that is a
money-correctness bug independent of everything else, because binary floats
cannot represent 0.10 EGP exactly and errors accumulate across a ledger.
**Check this.** The model below assumes integer minor units (piastres).

---

## 3. Target data model

Six entities, as requested. Written for Prisma, deliberately conservative so it
works on both SQLite and Postgres (the repo has `@prisma/adapter-libsql` and
`@prisma/adapter-pg` installed, so portability matters).

Design rules applied:

- **Money is `Int`, in piastres.** Never `Float`. `12050` = 120.50 EGP.
- **Provider references get real indexed columns** with a uniqueness constraint,
  so section 1.4 becomes impossible by construction.
- **State transitions are append-only.** `PaymentEvent` is the log; the status
  column on `Invoice` is a cached projection of it.
- **Enums are modelled as `String` with a documented union**, because SQLite
  does not support native enums. Validate at the application edge.

```prisma
/// A request for money. Created before the student is sent to a provider.
model Invoice {
  id            String    @id @default(cuid())
  /// Human-facing, sequential-ish, safe to read aloud on the phone: INV-2026-0001
  number        String    @unique
  userId        String
  user          User      @relation(fields: [userId], references: [id])

  /// "wallet_topup" | "course" | "plan" | "subscription"
  purpose       String
  /// Nullable target of the purchase, when not a plain top-up.
  courseId      String?
  planId        String?

  /// Piastres. subtotal + tax = total. Never Float.
  subtotal      Int
  tax           Int       @default(0)
  total         Int
  currency      String    @default("EGP")

  /// "draft"|"awaiting_payment"|"paid"|"partially_refunded"
  /// |"refunded"|"expired"|"cancelled"|"failed"
  /// Cached projection of PaymentEvent. Never the source of truth.
  status        String    @default("draft")

  /// "sha7nawy" | "shakeout" | "internal" | "bank"
  provider      String?
  /// The method key the student chose, e.g. "fawry", "card", "vodafone_cash".
  methodKey     String?

  /// Provider's own identifiers — first-class columns, not prose.
  providerInvoiceId  String?
  providerRef        String?
  /// Where to send the student to pay. Survives payment; never overwritten.
  checkoutUrl        String?

  expiresAt     DateTime?
  paidAt        DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  payments      Payment[]
  events        PaymentEvent[]
  receipt       Receipt?
  refunds       Refund[]

  /// Makes the section 1.4 mis-credit bug structurally impossible.
  @@unique([provider, providerInvoiceId])
  @@index([userId, status])
  @@index([status, expiresAt])
  @@index([providerRef])
}

/// An actual movement of money against an invoice. Usually one, but
/// split/retried payments mean this must be a collection.
model Payment {
  id            String   @id @default(cuid())
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])

  amount        Int
  currency      String   @default("EGP")
  /// "pending" | "succeeded" | "failed"
  status        String

  provider      String
  methodKey     String?
  /// The provider's transaction id. Unique per provider — this is the
  /// idempotency anchor for webhook replay.
  providerTxId  String?

  failureCode   String?
  failureMessage String?

  succeededAt   DateTime?
  createdAt     DateTime @default(now())

  @@unique([provider, providerTxId])
  @@index([invoiceId])
}

/// Append-only audit log. Never updated, never deleted. This is what makes
/// the timeline UI and dispute investigation possible.
model PaymentEvent {
  id          String   @id @default(cuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  paymentId   String?

  /// "invoice.created" | "checkout.opened" | "provider.pending"
  /// | "payment.succeeded" | "payment.failed" | "wallet.credited"
  /// | "receipt.issued" | "invoice.expired" | "refund.requested"
  /// | "refund.completed" | "admin.override"
  type        String

  /// Student-visible Arabic sentence for the timeline. Presentation only —
  /// never parsed. This is what `note` should always have been.
  message     String?

  /// "student" | "provider" | "system" | "admin"
  actorType   String   @default("system")
  actorId     String?

  /// JSON string. Raw provider payload for forensics.
  payload     String?

  createdAt   DateTime @default(now())

  @@index([invoiceId, createdAt])
}

/// Issued once, when an invoice is fully paid. Immutable by policy:
/// corrections happen via Refund + a new Invoice, never by editing a receipt.
model Receipt {
  id          String   @id @default(cuid())
  invoiceId   String   @unique
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])

  number      String   @unique   // RCP-2026-0001
  /// Snapshot of buyer + line items at issue time, as JSON. A receipt must not
  /// change because the student later renamed themselves.
  snapshot    String
  total       Int
  issuedAt    DateTime @default(now())
  pdfUrl      String?

  @@index([invoiceId])
}

model Refund {
  id            String    @id @default(cuid())
  invoiceId     String
  invoice       Invoice   @relation(fields: [invoiceId], references: [id])

  amount        Int
  /// "requested"|"approved"|"rejected"|"processing"|"completed"|"failed"
  status        String    @default("requested")

  /// Student's words.
  reason        String?
  /// Staff's words. Shown to the student on rejection.
  decisionNote  String?

  requestedById String
  reviewedById  String?
  reviewedAt    DateTime?
  completedAt   DateTime?

  /// "wallet" | "provider" | "manual"
  destination   String    @default("wallet")
  providerRefundId String?

  createdAt     DateTime  @default(now())

  @@index([invoiceId])
  @@index([status, createdAt])
}

/// Every inbound webhook, stored before it is acted on. Gives idempotency,
/// replay, and an answer to "did the provider actually tell us?".
model WebhookEvent {
  id            String    @id @default(cuid())
  provider      String
  /// Provider's event id when available; otherwise a hash of the raw body.
  /// Unique, so a replayed webhook can never double-credit.
  dedupeKey     String

  eventType     String?
  /// Raw body, verbatim. Never parsed for business data before verification.
  rawBody       String
  headers       String?

  signatureValid Boolean?
  /// "received"|"processed"|"ignored"|"failed"|"duplicate"
  status        String    @default("received")
  processingError String?

  invoiceId     String?
  receivedAt    DateTime  @default(now())
  processedAt   DateTime?

  @@unique([provider, dedupeKey])
  @@index([status, receivedAt])
}
```

### 3.1 What this buys immediately

| Requested feature | Today | With this model |
|---|---|---|
| Payment timeline | Impossible — state overwritten | `PaymentEvent` ordered by `createdAt` |
| Expired invoices | No such status | `status="expired"`, driven by `expiresAt` |
| Receipts / PDF | Nothing to render | `Receipt.snapshot` |
| Refund requests | Nothing | `Refund` with a review workflow |
| Webhook status (admin) | Not retained | `WebhookEvent` |
| Continue unpaid invoice | Regex out of `note` | `Invoice.checkoutUrl`, preserved |
| Cross-user mis-credit | Possible (1.4) | Blocked by `@@unique` |
| Webhook replay | Relies on type mutation | Blocked by `dedupeKey` |

---

## 4. Migration path

This is a live money system. It cannot be swapped in one commit.

**Phase 1 — additive.** Add all six tables. Change no existing code. Nothing
reads them yet. Zero risk.

**Phase 2 — dual write.** On invoice creation, write both the legacy
`balanceTransaction` pending row *and* an `Invoice`. In the webhook, write
`WebhookEvent` + `PaymentEvent` + `Payment` alongside the existing credit logic.
Legacy remains the source of truth. Compare the two for a week.

**Phase 3 — backfill.** One script, over historical rows:

```
for each balanceTransaction where type LIKE 'credit_shakeout%' or 'credit_sha7nawy%':
  ref = note.match(/(?:shakeout_ref|sha7nawy_ref):([^\s|]+)/)   // last time this regex is ever used
  url = note.match(/\|url:(https?:\/\/[^\s|]+)/)
  create Invoice(status = type.includes('pending') ? 'awaiting_payment' : 'paid',
                 providerRef = ref, checkoutUrl = url,
                 paidAt = type.includes('pending') ? null : createdAt)  // approximate; flag it
  create PaymentEvent('invoice.created', createdAt)
```

Backfilled `paidAt` is a guess, because the real timestamp was destroyed. Mark
those rows `backfilled: true` rather than pretending the data is exact. Expect
some rows to have no recoverable reference — those need manual review, not a
silent default.

**Phase 4 — cutover.** Financial Center reads only the new tables.
`balanceTransaction` becomes what it should always have been: a pure wallet
ledger, with a nullable `invoiceId` foreign key and a `note` that is only ever
displayed, never parsed.

Do not skip phase 2. And do not start any of this until section 1 is fixed —
backfilling a system that is actively being exploited just gives you tidy
records of the theft.

---

## 5. Design language — extending what exists

The existing dark theme, blue accent, Cairo, and RTL are kept. This is an
extension, not a rebrand. The goal for money pages is *boring and legible*.

### 5.1 Tokens

```css
:root {
  /* Spacing — 4px base. Only these values. */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 24px;  --space-6: 32px;
  --space-7: 48px; --space-8: 64px;

  /* Radius — one card radius, one control radius. */
  --radius-control: 8px;
  --radius-card: 12px;
  --radius-pill: 999px;

  /* Surfaces — four levels, dark. Flat fills only. */
  --surface-0: #0B0D10;   /* page */
  --surface-1: #12151A;   /* card */
  --surface-2: #191D24;   /* raised / table header */
  --surface-3: #212731;   /* hover */
  --border:    #262C36;
  --border-strong: #333B47;

  /* Text */
  --text-primary:   #E8EBF0;
  --text-secondary: #9BA4B2;
  --text-tertiary:  #6B7ембр280;

  /* One accent. */
  --accent:       #3B82F6;
  --accent-hover: #2E6FD9;
  --accent-subtle: rgba(59,130,246,0.12);

  /* Status — used ONLY for status, never decoration. */
  --success: #34D399;  --success-bg: rgba(52,211,153,0.10);
  --warning: #FBBF24;  --warning-bg: rgba(251,191,36,0.10);
  --danger:  #F87171;  --danger-bg:  rgba(248,113,113,0.10);
  --neutral: #9BA4B2;  --neutral-bg: rgba(155,164,178,0.10);

  /* Type — Cairo. Money uses tabular figures so columns align. */
  --font-sans: "Cairo", system-ui, sans-serif;
  --fs-display: 32px;  /* balance only */
  --fs-h1: 24px; --fs-h2: 18px; --fs-body: 15px;
  --fs-sm: 13px; --fs-xs: 12px;
  --fw-regular: 400; --fw-medium: 500; --fw-bold: 700;

  /* Motion */
  --ease: cubic-bezier(0.2, 0, 0.2, 1);
  --dur-fast: 120ms; --dur-base: 200ms;
}

/* Every monetary figure, everywhere. */
.amount {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

### 5.2 Hard rules

1. **No gradients on financial surfaces.** Flat fills only.
2. **No glassmorphism, no blur.**
3. **One accent colour.** Blue means "the primary action". If everything is
   blue, nothing is.
4. **Status colour is semantic only.** Never green because it looks nice.
5. **One primary button per screen.** Everything else is secondary or a link.
6. **Numbers are tabular.** Non-negotiable in a table of money.
7. **Amounts always carry the currency and never abbreviate.** `1٫250٫00 جنيه`,
   never `1.2k`.
8. **RTL is the base direction; numerals and Latin references stay LTR** inside
   an RTL line. Wrap references in `<span dir="ltr">`. Test with a real
   reference like `1234/AB-99` — this is where RTL layouts usually break.
9. **Motion is functional**: 120ms on hover/press, 200ms on entry. No parallax,
   no autoplay, no animated balance count-up on money pages — a number that
   spins looks like a slot machine, which is exactly the wrong feeling.

### 5.3 The page skeleton every financial page uses

```
H1 (what page is this)
One-sentence description (why this page exists)
[Primary action, if any]
---
Content
```

Applied literally: no financial page may open with a bare table.

---

## 6. Information architecture

One hub, `/account/financial`, with persistent sub-navigation. Navigation never
changes; only the body does.

```
المركز المالي  (Financial Center)
├─ نظرة عامة        Overview      — balance, alerts, what needs attention
├─ الفواتير          Invoices      — all invoices, filterable by status
├─ الإيصالات         Receipts      — paid only, downloadable
├─ الاشتراكات        Subscriptions — active plans, renewal dates
├─ سجل المحفظة       Wallet ledger — every credit and debit
├─ طرق الدفع         Methods       — available providers + fees
├─ طلبات الاسترداد    Refunds       — request + track
└─ شحن الرصيد        Top up        — the one write action
```

Redeem-a-code lives on **Top up**, not as its own page — it is one of two ways
to add balance, so it belongs beside the other one. (This is a deliberate
departure from the flat list in the brief, which had "Redeem code" as a peer of
"Wallet". Nine sibling pages is more than a student can hold in their head.)

---

## 7. Page specifications

### 7.1 Overview

Purpose: answer "where does my money stand, and is anything wrong?" in under
two seconds.

```
المركز المالي
إدارة رصيدك وفواتيرك واشتراكاتك في مكان واحد.

┌─ الرصيد الحالي ──────────────────────────┐
│  1٫250٫00 جنيه            [شحن الرصيد]   │
│  آخر تحديث: اليوم 4:32 م                  │
└──────────────────────────────────────────┘

[ Alert band — only rendered when true ]
⚠ لديك فاتورة بقيمة 300 جنيه تنتهي غداً.
  [متابعة الدفع]  [عرض الفاتورة]

┌ فواتير معلقة 2 ┐ ┌ اشتراكات نشطة 1 ┐ ┌ إيصالات 14 ┐

آخر العمليات
[5 rows, then: عرض السجل الكامل]
```

The alert band is the most valuable element on the page and must not render when
there is nothing wrong. An empty warning slot trains people to ignore warnings.

### 7.2 Invoice detail — the trust-critical page

This page exists to answer one unspoken question: *"did my money disappear?"*

```
فاتورة INV-2026-0042                       [معلقة]
أنشئت في 4 أغسطس 2026، 6:12 م

┌─ ملخص ───────────────────────────────────┐
│ القيمة            300٫00 جنيه             │
│ الغرض             شحن رصيد                │
│ طريقة الدفع        فوري                   │
│ الرقم المرجعي      1234567890  [نسخ]      │
│ تنتهي في          11 أغسطس 2026            │
└──────────────────────────────────────────┘

┌─ كيف تكمل الدفع ─────────────────────────┐
│ 1. اذهب إلى أي فرع فوري أو تطبيق فوري.     │
│ 2. اطلب "دفع فاتورة" واذكر الرقم المرجعي.  │
│ 3. ادفع 300 جنيه.                        │
│ 4. ارجع هنا — سنضيف الرصيد تلقائياً وسنرسل  │
│    لك إشعاراً. لا تحتاج لفعل أي شيء آخر.    │
│                                          │
│ الدفع يستغرق عادة أقل من 5 دقائق للتأكيد.  │
└──────────────────────────────────────────┘

[متابعة الدفع]   [نسخ الرقم المرجعي]

┌─ سجل الفاتورة ───────────────────────────┐
│ ● 6:12 م   تم إنشاء الفاتورة              │
│ ● 6:12 م   تم إرسالك إلى بوابة الدفع       │
│ ○ ينتظر    في انتظار تأكيد الدفع           │
│ ○          إضافة الرصيد                   │
│ ○          إصدار الإيصال                  │
└──────────────────────────────────────────┘

لم يتم إضافة رصيدك بعد الدفع؟ [تواصل مع الدعم]
```

The timeline shows **future steps greyed out**, not just past ones. That is what
removes anxiety: the student can see that "waiting" is a normal stage with
something after it, rather than a dead end. This is rendered directly from
`PaymentEvent` plus the known remaining steps for the status — and it is the
concrete feature that section 2.2 proves is impossible today.

Step 4 is the highest-value microcopy on the platform. "We will notify you, you
need do nothing" is the sentence that prevents the support ticket.

### 7.3 Status vocabulary

One mapping, used everywhere. A status must never be styled ad hoc per page.

| Status | Arabic | Colour | Student meaning |
|---|---|---|---|
| `awaiting_payment` | معلقة | warning | Action needed from you |
| `paid` | مدفوعة | success | Done |
| `expired` | منتهية | neutral | Too late; make a new one |
| `cancelled` | ملغاة | neutral | You or we cancelled it |
| `failed` | فشلت | danger | Something broke; not your fault |
| `refunded` | مستردة | neutral | Money returned |
| `partially_refunded` | مستردة جزئياً | neutral | Part returned |

Note `failed` is the only `danger` state, and its copy must not blame the
student.

### 7.4 Empty states

Every one follows: what is empty -> why -> what to do.

```
  لا توجد فواتير بعد
  ستظهر هنا كل فاتورة تنشئها عند شحن رصيدك
  أو شراء كورس.
  [شحن الرصيد]
```

```
  لا توجد إيصالات بعد
  يُصدر الإيصال تلقائياً بعد كل عملية دفع ناجحة،
  ويمكنك تحميله كملف PDF.
  [عرض الفواتير المعلقة]
```

Never `لا توجد بيانات`.

### 7.5 Refund request

Money-back flows are where trust is won or lost. Set expectations numerically.

```
طلب استرداد
اختر الفاتورة وسنراجع طلبك خلال 3 أيام عمل.

[Invoice picker — paid invoices only]
السبب (اختياري)
[textarea]

يُرد المبلغ إلى محفظتك على المنصة افتراضياً.
[إرسال الطلب]
```

After submission the request appears in the same timeline component as the
invoice, with its own states. Reuse, do not rebuild.

---

## 8. Component inventory

Build these before building pages. Every later page inherits them.

| Component | Notes |
|---|---|
| `PageHeader` | H1 + description + optional action. Enforces the skeleton. |
| `Card` | `surface-1`, 1px border, `radius-card`. No shadow. |
| `StatusBadge` | Takes a status key only. Owns the 7.3 mapping. |
| `Amount` | Takes piastres `Int`. Owns formatting, currency, tabular nums. |
| `Timeline` | Past/current/future steps. Used by invoices and refunds. |
| `DataTable` | Sticky header, zebra-free, right-aligned amounts. |
| `EmptyState` | Title + explanation + action. Explanation is required. |
| `CopyField` | Reference + copy button + confirmation. `dir="ltr"`. |
| `AlertBand` | Renders nothing when there is nothing to say. |
| `InstructionList` | Numbered next-steps block. |

`Amount` taking piastres and owning all formatting is what stops the platform
from drifting into inconsistent money rendering later.

---

## 9. Sequenced plan

1. **Fix section 1.1 and 1.4.** Nothing else matters while wallets can be
   credited for free.
2. **Check the `amount` column type** (section 2.4).
3. Phase 1 migration — add the six tables.
4. Build `Amount`, `StatusBadge`, `Timeline`, `EmptyState`, `PageHeader`.
5. Phase 2 dual write; observe for a week.
6. Build Overview + Invoice detail against the new model.
7. Phase 3 backfill.
8. Remaining pages: Receipts, Refunds, Subscriptions, Methods.
9. Phase 4 cutover.
10. Only then extend the design language outward to the other 25 pages.

---

## 10. What I did not check

Absence of a finding here means nobody looked.

- `prisma/schema.prisma` — including the real `BalanceTransaction`,
  `MoneyCode`, and `User.balance` definitions and their column types.
- `src/lib/sha7nawy.ts` and all `src/app/api/payments/sha7nawy/*`. The Sha7nawy
  webhook is **very likely to have the same P0 defect** as section 1.1, since
  the two providers share helpers and the `sha7nawy_ref` prose convention. It
  was not read. Check it with priority.
- `src/app/api/payments/methods/*`.
- `src/app/(clerk)/account/page.tsx` — the current account UI, beyond one
  fragment showing it polls `/api/payments/shakeout/status` and `alert()`s the
  result.
- Whether any cron job expires stale pending transactions.
- `CODE-UP-EXECUTIVE-REVIEW.md` (23.9 KB) — may overlap or contradict this.
