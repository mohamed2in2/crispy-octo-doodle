import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET — current balance + last 20 transactions */
export async function GET() {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { balance: true } }),
    prisma.balanceTransaction.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, amount: true, note: true, createdAt: true },
    }),
  ]);

  return NextResponse.json(
    { balance: user?.balance ?? 0, transactions },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** POST — redeem a money code */
export async function POST(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: "الكود مطلوب" }, { status: 400 });

  const normalized = code.trim().toUpperCase();

  const moneyCode = await prisma.moneyCode.findUnique({ where: { code: normalized } });
  if (!moneyCode) return NextResponse.json({ error: "الكود غير صحيح" }, { status: 404 });
  if (moneyCode.isUsed) return NextResponse.json({ error: "هذا الكود مستخدم بالفعل" }, { status: 400 });
  if (moneyCode.expiresAt && moneyCode.expiresAt < new Date()) {
    return NextResponse.json({ error: "الكود منتهي الصلاحية" }, { status: 400 });
  }

  // Mark used + credit balance in a transaction
  // NULL-safe balance fetch before transaction
  const userRow = await prisma.user.findUnique({ where: { id: session.id }, select: { balance: true } });
  const newBalance = +((userRow?.balance ?? 0) + moneyCode.amount).toFixed(2);

  await prisma.$transaction([
    prisma.moneyCode.update({
      where: { id: moneyCode.id },
      data: { isUsed: true, usedById: session.id, usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: session.id },
      data: { balance: newBalance },
    }),
    prisma.balanceTransaction.create({
      data: {
        userId: session.id,
        type: "credit_code",
        amount: moneyCode.amount,
        note: `كود: ${normalized}`,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    credited: moneyCode.amount,
    message: `تم إضافة ${moneyCode.amount} جنيه إلى رصيدك!`,
  });
}
