import { NextRequest, NextResponse } from "next/server";

import { persistProviderSettlement } from "@/lib/financial/payment-persistence";
import { prisma } from "@/lib/prisma";
import { getShakeOutPaymentInfo, SHAKEOUT_CREDITED_TYPE, SHAKEOUT_PENDING_TYPE, shakeOutRefNote } from "@/lib/shakeout";

const PROVIDER_PAID_STATUSES = new Set(["paid", "completed", "success", "successful"]);

function extractRefId(note: string | null | undefined): string | null {
  const match = note?.match(/shakeout_ref:([^\s|]+)/);
  return match ? String(match[1]).split("/")[0] || null : null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    const event = payload.event || req.headers.get("x-webhook-event");
    const transaction = payload.transaction || payload.data || {};
    const status = transaction.status || req.headers.get("x-transaction-status") || payload.status;
    const reference = transaction.reference || req.headers.get("x-transaction-reference") || transaction.id;
    const transactionId = transaction.id || transaction.transaction_id || req.headers.get("x-transaction-id");

    if (event !== "transaction.updated" && !status) return NextResponse.json({ success: true, message: "Ignored non-transaction event" });
    if (!transactionId || !reference) return NextResponse.json({ error: "Missing transaction identifiers" }, { status: 400 });

    let verified;
    try {
      verified = await getShakeOutPaymentInfo(transactionId);
    } catch (error: unknown) {
      console.error("[Shake-Out Webhook] Verification unavailable:", error);
      return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503 });
    }
    if (!verified.status || !verified.data) return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 });

    const verifiedData = verified.data;
    const searchRef = String(reference).split("/")[0];
    const verifiedReference = verifiedData.reference ? String(verifiedData.reference).split("/")[0] : null;
    if (verifiedReference && verifiedReference !== searchRef) return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });

    const providerStatus = String(verifiedData.status || "").trim().toLowerCase();
    if (providerStatus === "rejected" || providerStatus === "failed" || providerStatus === "cancelled") {
      return NextResponse.json({ success: true, processed: false, reason: `Provider status is ${providerStatus}` });
    }
    if (!PROVIDER_PAID_STATUSES.has(providerStatus)) {
      return NextResponse.json({ success: true, processed: false, reason: `Provider status is ${providerStatus || "unknown"}` });
    }

    const candidates = await prisma.balanceTransaction.findMany({
      where: { type: SHAKEOUT_PENDING_TYPE, note: { contains: searchRef } },
      orderBy: { createdAt: "asc" },
      select: { id: true, userId: true, amount: true, note: true },
    });
    const matches = candidates.filter((candidate) => extractRefId(candidate.note) === searchRef);
    if (matches.length > 1) return NextResponse.json({ error: "Ambiguous transaction reference" }, { status: 409 });
    const pendingTx = matches[0];

    if (!pendingTx) {
      const credited = await prisma.balanceTransaction.findMany({ where: { type: SHAKEOUT_CREDITED_TYPE, note: { contains: searchRef } }, select: { note: true } });
      if (credited.some((candidate) => extractRefId(candidate.note) === searchRef)) {
        return NextResponse.json({ success: true, processed: false, reason: "Already credited" });
      }
      return NextResponse.json({ error: "Unknown transaction reference" }, { status: 400 });
    }

    // Only the provider lookup authorizes money movement; compare the verified
    // amount to the pending local intent before the atomic claim.
    const verifiedAmount = Number(verifiedData.amount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return NextResponse.json({ error: "Invalid verified amount" }, { status: 400 });
    }
    if (Math.abs(verifiedAmount - pendingTx.amount) > 0.01) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
    if (verifiedData.client && String(verifiedData.client) !== pendingTx.userId) {
      return NextResponse.json({ error: "Client mismatch" }, { status: 400 });
    }

    const processed = await prisma.$transaction(async (tx) => {
      const claim = await tx.balanceTransaction.updateMany({
        where: { id: pendingTx.id, type: SHAKEOUT_PENDING_TYPE },
        data: { type: SHAKEOUT_CREDITED_TYPE, note: `${shakeOutRefNote(String(reference))} — شحن محفظة عبر Shake-Out` },
      });
      if (claim.count === 0) return false;
      await tx.user.update({ where: { id: pendingTx.userId }, data: { balance: { increment: pendingTx.amount } } });
      return true;
    });
    if (!processed) return NextResponse.json({ success: true, processed: false, reason: "Already credited" });

    await persistProviderSettlement({ provider: "shakeout", reference: String(reference), transactionId: String(transactionId), totalPounds: pendingTx.amount });
    console.log(`[Shake-Out Webhook] Credited ${pendingTx.amount} EGP to user ${pendingTx.userId} (ref ${reference})`);
    return NextResponse.json({ success: true, credited: pendingTx.amount, reference });
  } catch (error: unknown) {
    console.error("[Shake-Out Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
