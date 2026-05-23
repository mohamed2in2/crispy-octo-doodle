import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Validation constants
const MAX_TITLE_LENGTH = 100;
const MIN_TITLE_LENGTH = 1;
const BUNNY_ID_REGEX = /^[a-z0-9-]+$/i;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id: folderId } = await params;
    const { title, bunnyId } = await req.json();

    // Validate title
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "عنوان الفيديو مطلوب" }, { status: 400 });
    }

    if (title.trim().length < MIN_TITLE_LENGTH) {
      return NextResponse.json({ error: "عنوان الفيديو لا يمكن أن يكون فارغاً" }, { status: 400 });
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `عنوان الفيديو لا يمكن أن يزيد عن ${MAX_TITLE_LENGTH} حرف` },
        { status: 400 }
      );
    }

    // Validate Bunny ID
    if (!bunnyId || typeof bunnyId !== "string") {
      return NextResponse.json({ error: "معرف Bunny مطلوب" }, { status: 400 });
    }

    if (bunnyId.trim().length === 0) {
      return NextResponse.json({ error: "معرف Bunny لا يمكن أن يكون فارغاً" }, { status: 400 });
    }

    if (!BUNNY_ID_REGEX.test(bunnyId)) {
      return NextResponse.json(
        { error: "معرف Bunny يجب أن يحتوي على أحرف وأرقام وشرطات فقط" },
        { status: 400 }
      );
    }

    // Verify folder exists and belongs to teacher's course
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        course: { teacherId: session.id },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "المحاضرة غير موجودة" }, { status: 404 });
    }

    // Check for duplicate video in same folder
    const existingVideo = await prisma.video.findFirst({
      where: {
        folderId,
        title: title.trim(),
      },
    });

    if (existingVideo) {
      return NextResponse.json(
        { error: "يوجد فيديو بنفس العنوان في هذه المحاضرة" },
        { status: 400 }
      );
    }

    // Get next order
    const count = await prisma.video.count({ where: { folderId } });

    // Create video
    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        bunnyId: bunnyId.trim(),
        folderId,
        order: count,
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    console.error("Failed to create video:", error);
    return NextResponse.json({ error: "تعذر إضافة الفيديو" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id: folderId } = await params;
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "معرف الفيديو مطلوب" }, { status: 400 });
    }

    // Verify folder exists and belongs to teacher
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        course: { teacherId: session.id },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "المحاضرة غير موجودة" }, { status: 404 });
    }

    // Find video
    const video = await prisma.video.findFirst({
      where: {
        id: videoId,
        folderId,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
    }

    // Delete video and its progress records
    await prisma.progress.deleteMany({
      where: { videoId },
    });

    await prisma.video.delete({
      where: { id: videoId },
    });

    return NextResponse.json({ success: true, message: "تم حذف الفيديو بنجاح" });
  } catch (error) {
    console.error("Failed to delete video:", error);
    return NextResponse.json({ error: "تعذر حذف الفيديو" }, { status: 500 });
  }
}
