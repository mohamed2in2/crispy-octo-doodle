import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_URL_LENGTH = 500;
const MIN_TITLE_LENGTH = 1;

function validateCourseData(data: any): { valid: boolean; error?: string } {
  if (data.title !== undefined) {
    if (typeof data.title !== "string" || data.title.trim().length < MIN_TITLE_LENGTH) {
      return { valid: false, error: "العنوان مطلوب" };
    }
    if (data.title.length > MAX_TITLE_LENGTH) {
      return { valid: false, error: `العنوان لا يمكن أن يزيد عن ${MAX_TITLE_LENGTH} حرف` };
    }
  }

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== "string") {
      return { valid: false, error: "الوصف يجب أن يكون نصاً" };
    }
    if (data.description.length > MAX_DESCRIPTION_LENGTH) {
      return { valid: false, error: `الوصف لا يمكن أن يزيد عن ${MAX_DESCRIPTION_LENGTH} حرف` };
    }
  }

  if (data.thumbnailUrl !== undefined && data.thumbnailUrl !== null) {
    if (typeof data.thumbnailUrl !== "string") {
      return { valid: false, error: "رابط الصورة يجب أن يكون نصاً" };
    }
    if (data.thumbnailUrl.length > MAX_URL_LENGTH) {
      return { valid: false, error: `رابط الصورة طويل جداً` };
    }
    if (data.thumbnailUrl.trim().length > 0 && !isValidUrl(data.thumbnailUrl)) {
      return { valid: false, error: "رابط الصورة غير صحيح" };
    }
  }

  return { valid: true };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { id, teacherId: session.id },
    });

    if (!course) {
      return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });
    }

    // Delete course cascade (folders, videos, quizzes, access codes, progress records)
    await prisma.course.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم حذف الكورس بنجاح" });
  } catch (error) {
    console.error("Failed to delete course:", error);
    return NextResponse.json({ error: "تعذر حذف الكورس" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "teacher") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { id, teacherId: session.id },
    });

    if (!course) {
      return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });
    }

    const data = await req.json();

    // Validate course data
    const validation = validateCourseData(data);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.subject !== undefined) {
      updateData.subject = data.subject ? data.subject.trim() : undefined;
    }
    if (data.educationalStage !== undefined) {
      updateData.educationalStage = data.educationalStage ? data.educationalStage.trim() : undefined;
    }
    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }
    if (data.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = data.thumbnailUrl ? data.thumbnailUrl.trim() : null;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error("Failed to update course:", error);
    return NextResponse.json({ error: "تعذر تحديث الكورس" }, { status: 500 });
  }
}
