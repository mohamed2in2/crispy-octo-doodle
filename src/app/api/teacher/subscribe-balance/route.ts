import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً لشراء الاشتراك بالرصيد" }, { status: 401 });
    }

    const { amount, planLabel, teacherName } = await req.json().catch(() => ({}));

    const numAmount = typeof amount === "number" ? amount : parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "مبلغ غير صحيح" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, balance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (user.balance < numAmount) {
      return NextResponse.json(
        {
          error: `رصيدك الحالي (${user.balance} جنيه) لا يكفي لشراء الاشتراك (${numAmount} جنيه). يرجى شحن رصيدك أولاً.`,
        },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: session.id },
        data: { balance: { decrement: numAmount } },
      });

      await tx.balanceTransaction.create({
        data: {
          userId: session.id,
          type: "debit_purchase",
          amount: numAmount,
          note: `حجز اشتراك (${planLabel || "خطة حجز"}) - أستاذ ${teacherName || "المعلم"}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `تم الشراء وحجز الاشتراك بنجاح! خُصم ${numAmount} جنيه من رصيدك. رصيدك الحالي: ${updatedUser.balance} جنيه.`,
      newBalance: updatedUser.balance,
    });
  } catch (error: any) {
    console.error("[subscribe-balance] error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء خصم الرصيد" }, { status: 500 });
  }
}
