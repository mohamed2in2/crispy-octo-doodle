import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSha7nawyPaymentInfo } from "@/lib/sha7nawy";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));
    console.log("[Sha7nawy Webhook] Body:", JSON.stringify(payload));

    const event = payload.event || req.headers.get("x-webhook-event");
    const transaction = payload.transaction || payload.data || {};

    const status = transaction.status || req.headers.get("x-transaction-status") || payload.status;
    const reference = transaction.reference || req.headers.get("x-transaction-reference") || transaction.id;
    const clientUserId = transaction.client || payload.client;
    const rawAmount = transaction.amount || payload.amount;
    const transactionId = transaction.id || req.headers.get("x-transaction-id");

    if (event !== "transaction.updated" && !status) {
      return NextResponse.json({ success: true, message: "Ignored non-transaction event" }, { status: 200 });
    }

    if (status === "rejected") {
      console.log(`[Sha7nawy Webhook] Transaction ${reference} was rejected/failed.`);
      return NextResponse.json({ success: true, processed: false, reason: "Transaction rejected" }, { status: 200 });
    }

    const isCompleted = status === "completed" || status === "success" || status === "paid";
    if (!isCompleted) {
      return NextResponse.json({ success: true, processed: false, reason: `Status is ${status}` }, { status: 200 });
    }

    // Optional Security Best Practice: Verify directly with Sha7nawy Server via Secret Key if transactionId is present
    if (transactionId && process.env.SHA7NAWY_SECRET_KEY) {
      const verifyRes = await getSha7nawyPaymentInfo(transactionId);
      if (verifyRes.status && verifyRes.data) {
        if (verifyRes.data.status !== "completed") {
          console.warn(`[Sha7nawy Webhook] Security verification failed: Server status is ${verifyRes.data.status}`);
          return NextResponse.json({ error: "Verification status mismatch" }, { status: 400 });
        }
      }
    }

    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);

    if (!clientUserId || !amount || isNaN(amount) || amount <= 0) {
      console.warn("[Sha7nawy Webhook] Missing client or amount in payload:", { clientUserId, amount });
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    // Find student in DB
    const user = await prisma.user.findUnique({
      where: { id: clientUserId },
      select: { id: true, balance: true },
    });

    if (!user) {
      console.error(`[Sha7nawy Webhook] User ID ${clientUserId} not found.`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check Idempotency: Prevent duplicate credits for the same reference
    const noteSearch = `مرجع: ${reference}`;
    const existingTx = await prisma.balanceTransaction.findFirst({
      where: {
        userId: user.id,
        note: { contains: reference ? String(reference) : "sha7nawy" },
      },
    });

    if (existingTx) {
      console.log(`[Sha7nawy Webhook] Reference ${reference} already credited.`);
      return NextResponse.json({ success: true, processed: false, reason: "Already credited" }, { status: 200 });
    }

    // Atomically credit user balance and log ledger entry
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: amount } },
      });

      await tx.balanceTransaction.create({
        data: {
          userId: user.id,
          type: "credit_sha7nawy_wallet",
          amount: amount,
          note: `شحن محفظة عبر Sha7nawy (مرجع: ${reference || "N/A"})`,
        },
      });
    });

    console.log(`[Sha7nawy Webhook] Successfully credited ${amount} EGP to student ${user.id}`);
    return NextResponse.json({ success: true, credited: amount, reference }, { status: 200 });
  } catch (error: any) {
    console.error("[Sha7nawy Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
