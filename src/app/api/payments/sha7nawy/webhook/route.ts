import { NextRequest, NextResponse } from "next/server";

import { persistProviderSettlement } from "@/lib/financial/payment-persistence";
import { prisma } from "@/lib/prisma";
import { getSha7nawyPaymentInfo, SHA7NAWY_CREDITED_TYPE, SHA7NAWY_PENDING_TYPE, sha7nawyRefNote } from "@/lib/sha7nawy";

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
      verified = await getSha7nawyPaymentInfo(transactionId);
    } catch (error: unknown) {
      console.error("[Sha7nawy Webhook] Verification unavailable:", error);
      return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503 });
    }
    if (!verified.status || !verified.data) return NextResponse.json({ error: "Transaction verification failed" }, { status: 400 });

    const verifiedData = verified.data;
    const verifiedStatus = String(verifiedData.status || "").toLowerCase();
    if (!["completed", "success", "paid"].includes(verifiedStatus)) {
      return NextResponse.json({ success: true, processed: false, reason: `Provider status is ${verifiedStatus || "unknown"}` });
    }
    if (verifiedData.reference && String(verifiedData.reference) !== String(reference)) {
      return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
    }

    const pendingTx = await prisma.balanceTransaction.findFirst({
      where: { type: SHA7NAWY_PENDING_TYPE, note: sha7nawyRefNote(String(reference)) },
      select: { id: true, userId: true, amount: true },
    });
    if (!pendingTx) {
      const alreadyCredited = await prisma.balanceTransaction.findFirst({ where: { type: SHA7NAWY_CREDITED_TYPE, note: sha7nawyRefNote(String(reference)) }, select: { id: true } });
      if (alreadyCredited) return NextResponse.json({ success: true, processed: false, reason: "Already credited" });
      return NextResponse.json({ error: "Unknown transaction reference" }, { status: 400 });
    }
    if (verifiedData.client && String(verifiedData.client) !== pendingTx.userId) return NextResponse.json({ error: "Client mismatch" }, { status: 400 });

    const verifiedAmount = Number(verifiedData.amount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) return NextResponse.json({ error: "Invalid verified amount" }, { status: 400 });
    if (Math.abs(verifiedAmount - pendingTx.amount) > 0.01) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });

    const processed = await prisma.$transaction(async (tx) => {
      const claim = await tx.balanceTransaction.updateMany({
        where: { id: pendingTx.id, type: SHA7NAWY_PENDING_TYPE },
        data: { type: SHA7NAWY_CREDITED_TYPE, note: `${sha7nawyRefNote(String(reference))} — شحن محفظة عبر Sha7nawy` },
      });
      if (claim.count === 0) return false;
      await tx.user.update({ where: { id: pendingTx.userId }, data: { balance: { increment: pendingTx.amount } } });
      return true;
    });
    if (!processed) return NextResponse.json({ success: true, processed: false, reason: "Already credited" });

    await persistProviderSettlement({ provider: "sha7nawy", reference: String(reference), transactionId: String(transactionId), totalPounds: pendingTx.amount });
    console.log(`[Sha7nawy Webhook] Credited ${pendingTx.amount} EGP to user ${pendingTx.userId} (ref ${reference})`);
    return NextResponse.json({ success: true, credited: pendingTx.amount, reference });
  } catch (error: unknown) {
    console.error("[Sha7nawy Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
