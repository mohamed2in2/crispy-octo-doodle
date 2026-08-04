import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getShakeOutPaymentInfo,
  SHAKEOUT_PENDING_TYPE,
  SHAKEOUT_CREDITED_TYPE,
  shakeOutRefNote,
} from "@/lib/shakeout";

/**
 * Statuses that Shake-Out uses to mean "the money arrived".
 *
 * NOTE: these are inferred from the strings this codebase already treats as
 * success elsewhere. They have NOT been confirmed against Shake-Out's API
 * documentation. If the provider returns something outside this list (e.g.
 * "PAID" in a different case is handled, but "1" or "settled" is not), real
 * payments will be rejected and left pending rather than wrongly credited.
 * That is the safe direction to fail, but confirm the vocabulary before
 * relying on this in production.
 */
const PROVIDER_PAID_STATUSES = new Set(["paid", "completed", "success", "successful"]);

/**
 * Pulls the invoice-id portion of a `shakeout_ref:<id>/<ref>` token out of a
 * transaction note.
 *
 * This exists only because the provider reference is currently stored inside a
 * free-text column. See docs/PAYMENT-CENTER-SPEC.md section 2 — once the
 * Invoice model lands, this should be deleted in favour of an indexed column.
 */
function extractRefId(note: string | null | undefined): string | null {
  if (!note) return null;
  const match = note.match(/shakeout_ref:([^\s|]+)/);
  if (!match) return null;
  return String(match[1]).split("/")[0] || null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    const event = payload.event || req.headers.get("x-webhook-event");
    const transaction = payload.transaction || payload.data || {};

    const status = transaction.status || req.headers.get("x-transaction-status") || payload.status;
    const reference = transaction.reference || req.headers.get("x-transaction-reference") || transaction.id;
    const transactionId = transaction.id || transaction.transaction_id || req.headers.get("x-transaction-id");

    if (event !== "transaction.updated" && !status) {
      return NextResponse.json({ success: true, message: "Ignored non-transaction event" }, { status: 200 });
    }

    if (!transactionId || !reference) {
      console.warn("[Shake-Out Webhook] Missing transactionId or reference");
      return NextResponse.json({ error: "Missing transaction identifiers" }, { status: 400 });
    }

    // The body is untrusted: this endpoint is public and unsigned. The status
    // reported here is only a hint that something MAY have changed, never
    // grounds to move money.
    let verified;
    try {
      verified = await getShakeOutPaymentInfo(transactionId);
    } catch (verifyError: any) {
      console.error("[Shake-Out Webhook] Verification unavailable:", verifyError?.message || verifyError);
      return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503 });
    }

    // `verified.status` only means the lookup CALL succeeded.
    if (!verified.status || !verified.data) {
      console.warn(`[Shake-Out Webhook] Verification failed for transaction ${transactionId} (ref ${reference})`);
      return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 });
    }

    const verifiedData = verified.data;
    const verifiedReference = verifiedData.reference ? String(verifiedData.reference) : null;

    const searchRef = String(reference || transactionId || "").split("/")[0];

    // Confirm the invoice we just looked up is the one being claimed, so a
    // valid reference cannot be used to settle a different invoice.
    if (verifiedReference && verifiedReference.split("/")[0] !== searchRef) {
      console.warn(
        `[Shake-Out Webhook] Reference mismatch: claimed ${searchRef}, provider returned ${verifiedReference}`
      );
      return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
    }

    // THE authorization decision. Only the provider's own invoice status may
    // authorise a credit — never `status` from the request body.
    const providerStatus = String(verifiedData.status || "").trim().toLowerCase();

    if (providerStatus === "rejected" || providerStatus === "failed" || providerStatus === "cancelled") {
      console.warn(`[Shake-Out Webhook] Transaction ${reference} was ${providerStatus} per provider.`);
      return NextResponse.json(
        { success: true, processed: false, reason: `Provider status is ${providerStatus}` },
        { status: 200 }
      );
    }

    if (!PROVIDER_PAID_STATUSES.has(providerStatus)) {
      // Includes "pending" and "unknown". Acknowledge so the provider stops
      // retrying, but do not credit.
      return NextResponse.json(
        { success: true, processed: false, reason: `Provider status is ${providerStatus || "unknown"}` },
        { status: 200 }
      );
    }

    // Narrow by substring first (all the database can do while the reference
    // lives in prose), then require an exact match on the parsed id segment so
    // a prefix collision cannot credit another student's pending top-up.
    const candidates = await prisma.balanceTransaction.findMany({
      where: {
        type: SHAKEOUT_PENDING_TYPE,
        note: { contains: searchRef },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true, amount: true, note: true },
    });

    const matches = candidates.filter((tx) => extractRefId(tx.note) === searchRef);

    if (matches.length > 1) {
      // Ambiguous: refuse rather than guess which student gets the money.
      console.error(
        `[Shake-Out Webhook] ${matches.length} pending transactions match ref ${searchRef}; refusing to credit.`
      );
      return NextResponse.json({ error: "Ambiguous transaction reference" }, { status: 409 });
    }

    const pendingTx = matches[0];

    if (!pendingTx) {
      const credited = await prisma.balanceTransaction.findMany({
        where: {
          type: SHAKEOUT_CREDITED_TYPE,
          note: { contains: searchRef },
        },
        select: { id: true, note: true },
      });
      const alreadyCredited = credited.some((tx) => extractRefId(tx.note) === searchRef);

      if (alreadyCredited) {
        return NextResponse.json({ success: true, processed: false, reason: "Already credited" }, { status: 200 });
      }
      console.warn(`[Shake-Out Webhook] No pending transaction found for ref ${reference} (searchRef: ${searchRef})`);
      return NextResponse.json({ error: "Unknown transaction reference" }, { status: 400 });
    }

    const processed = await prisma.$transaction(async (tx) => {
      const claim = await tx.balanceTransaction.updateMany({
        where: { id: pendingTx.id, type: SHAKEOUT_PENDING_TYPE },
        data: {
          type: SHAKEOUT_CREDITED_TYPE,
          note: `${shakeOutRefNote(String(reference))} — شحن محفطة عبر Shake-Out`,
        },
      });

      if (claim.count === 0) {
        return false;
      }

      await tx.user.update({
        where: { id: pendingTx.userId },
        data: { balance: { increment: pendingTx.amount } },
      });

      return true;
    });

    if (!processed) {
      return NextResponse.json({ success: true, processed: false, reason: "Already credited" }, { status: 200 });
    }

    console.log(`[Shake-Out Webhook] Credited ${pendingTx.amount} EGP to user ${pendingTx.userId} (ref ${reference})`);
    return NextResponse.json({ success: true, credited: pendingTx.amount, reference }, { status: 200 });
  } catch (error: any) {
    console.error("[Shake-Out Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
