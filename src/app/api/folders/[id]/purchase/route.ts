import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/folders/[id]/purchase
 * Student purchases access to a specific folder.
 * Deducts balance (or marks as free if folder.price === 0).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "student")
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id: folderId } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { course: { select: { id: true, teacherId: true, title: true } } },
  });

  if (!folder)
    return NextResponse.json({ error: "المجلد غير موجود" }, { status: 404 });

  if (!folder.isPurchasable)
    return NextResponse.json(
      { error: "هذا المجلد غير متاح للشراء منفرداً — يمكنك شراء الكورس كاملاً بكود وصول" },
      { status: 403 }
    );

  // Prevent double purchase
  const existing = await prisma.folderPurchase.findUnique({
    where: { studentId_folderId: { studentId: session.id, folderId } },
  });
  if (existing)
    return NextResponse.json({ error: "لقد اشتريت هذا المجلد بالفعل", alreadyOwned: true });

  const price = folder.price ?? 0;

  if (price > 0) {
    const student = await prisma.user.findUnique({
      where: { id: session.id },
      select: { balance: true },
    });
    if (!student || (student.balance ?? 0) < price)
      return NextResponse.json({ error: "رصيدك غير كافٍ", required: price }, { status: 402 });

    // Deduct balance
    await prisma.user.update({
      where: { id: session.id },
      data: { balance: { decrement: price } },
    });
  }

  const purchase = await prisma.folderPurchase.create({
    data: { studentId: session.id, folderId, price },
  });

  return NextResponse.json({ purchase, message: "تم شراء المجلد بنجاح" }, { status: 201 });
}

/** GET /api/folders/[id]/purchase — check if student owns this folder */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ owned: false });

  const { id: folderId } = await params;
  const purchase = await prisma.folderPurchase.findUnique({
    where: { studentId_folderId: { studentId: session.id, folderId } },
  });
  return NextResponse.json({ owned: !!purchase });
}
