import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getShakeOutPaymentInfo,
  SHAKEOUT_CREDITED_TYPE,
  SHAKEOUT_PENDING_TYPE,
  shakeOutRefNote,
} from "@/lib/shakeout";
import { getPaymentMethod } from "@/lib/payment-methods";

const PAID_STATUSES = new Set(["paid", "completed", "success", "successful", "approved"]);

function extractReferenceId(note: string | null): string | null {
  if (!note) return null;
  const match = note.match(/shakeout_ref:([^\s|]+)/);
  return match?.[1]?.split("/")[0] || null;
}

/**
 * GET /api/payments/shakeout/status?transactionId=123
 * Verifies a Shake-Out invoice and atomically credits only the signed-in
 * student's exact pending transaction.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const transactionId = searchParams.get("transactionId")?.trim();
  if (!transactionId) {
    return NextResponse.json({ error: "معرف المعاملة مطلوب" }, { status: 400 });
  }

  const claimedId = transactionId.split("/")[0];
  const gatewayInfo = await getShakeOutPaymentInfo(transactionId);
  if (!gatewayInfo.status || !gatewayInfo.data) {
    return NextResponse.json(
      { error: gatewayInfo.message || "فشل جلب حالة الدفع من Shake-Out" },
      { status: gatewayInfo.code || 500 }
    );
  }

  const data = gatewayInfo.data;
  const verifiedReference = String(data.reference || data.invoice_id || "");
  const verifiedId = verifiedReference.split("/")[0];
  if (!verifiedId || verifiedId !== claimedId) {
    return NextResponse.json({ error: "مرجع الدفع غير متطابق" }, { status: 400 });
  }

  const candidates = await prisma.balanceTransaction.findMany({
    where: {
      userId: session.id,
      type: { in: [SHAKEOUT_PENDING_TYPE, SHAKEOUT_CREDITED_TYPE] },
      note: { contains: claimedId },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, amount: true, note: true },
  });
  const exactMatches = candidates.filter((transaction) => extractReferenceId(transaction.note) === claimedId);

  if (exactMatches.length !== 1) {
    return NextResponse.json(
      { error: exactMatches.length ? "مرجع الدفع غير محدد بشكل فريد" : "المعاملة غير صالحة للمستخدم الحالي" },
      { status: exactMatches.length ? 409 : 403 }
    );
  }

  const existingTx = exactMatches[0];
  const normalizedStatus = String(data.status || "unknown").trim().toLowerCase();
  const isPaid = PAID_STATUSES.has(normalizedStatus);
  const verifiedAmount = Number(data.amount);

  if (isPaid) {
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      return NextResponse.json({ error: "قيمة الدفع المؤكدة غير صالحة" }, { status: 400 });
    }
    if (Math.abs(verifiedAmount - existingTx.amount) > 0.01) {
      return NextResponse.json({ error: "قيمة الدفع لا تطابق الفاتورة" }, { status: 400 });
    }
  }

  if (isPaid && existingTx.type === SHAKEOUT_PENDING_TYPE) {
    const processed = await prisma.$transaction(async (tx) => {
      const claim = await tx.balanceTransaction.updateMany({
        where: { id: existingTx.id, userId: session.id, type: SHAKEOUT_PENDING_TYPE },
        data: {
          type: SHAKEOUT_CREDITED_TYPE,
          note: `${shakeOutRefNote(String(data.reference))} — شحن محفظة عبر Shake-Out`,
        },
      });
      if (claim.count !== 1) return false;

      await tx.user.update({
        where: { id: session.id },
        data: { balance: { increment: existingTx.amount } },
      });
      return true;
    });

    if (!processed) {
      return NextResponse.json({ success: true, paid: true, processed: false, reason: "Already credited" });
    }

    return NextResponse.json({
      success: true,
      paid: true,
      transactionId,
      reference: data.reference,
      status: "paid",
      amount: existingTx.amount,
      message: "تم تأكيد السداد وإضافة الرصيد إلى حسابك بنجاح! 🎉",
    });
  }

  return NextResponse.json({
    success: true,
    paid: isPaid,
    transactionId,
    reference: data.reference,
    status: normalizedStatus,
    amount: existingTx.amount,
    method: data.method,
    methodLabel: getPaymentMethod(data.method as string)?.label ?? data.method,
  });
}
