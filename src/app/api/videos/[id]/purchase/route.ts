import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/videos/[id]/purchase
 * Student purchases access to a single video/lesson.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "student")
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id: videoId } = await params;

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { folder: { include: { course: { select: { id: true, title: true } } } } },
  });

  if (!video)
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });

  // Prevent double purchase
  const existing = await prisma.videoPurchase.findUnique({
    where: { studentId_videoId: { studentId: session.id, videoId } },
  });
  if (existing)
    return NextResponse.json({ error: "لقد اشتريت هذا الدرس بالفعل", alreadyOwned: true });

  const price = video.price ?? 0;

  if (price > 0) {
    const student = await prisma.user.findUnique({
      where: { id: session.id },
      select: { balance: true },
    });
    if (!student || (student.balance ?? 0) < price)
      return NextResponse.json({ error: "رصيدك غير كافٍ", required: price }, { status: 402 });

    await prisma.user.update({
      where: { id: session.id },
      data: { balance: { decrement: price } },
    });
  }

  const purchase = await prisma.videoPurchase.create({
    data: { studentId: session.id, videoId, price },
  });

  return NextResponse.json({ purchase, message: "تم شراء الدرس بنجاح" }, { status: 201 });
}

/** GET /api/videos/[id]/purchase — check if student owns this video */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ owned: false });

  const { id: videoId } = await params;
  const purchase = await prisma.videoPurchase.findUnique({
    where: { studentId_videoId: { studentId: session.id, videoId } },
  });
  return NextResponse.json({ owned: !!purchase });
}
