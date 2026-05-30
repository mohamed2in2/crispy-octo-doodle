import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true } },
        folders: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { videos: true, quizzes: true } },
          },
        },
      },
    });

    if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

    let hasAccess = false;
    try {
      const session = await getStudentSession();
      if (session) {
        hasAccess = !!(await prisma.accessCode.findFirst({ where: { courseId: id, studentId: session.id } }));
      }
    } catch {
      // If auth fails, just show as no-access
    }

    const totalVideos = course.folders.reduce((sum, f) => sum + f._count.videos, 0);
    const totalQuizzes = course.folders.reduce((sum, f) => sum + f._count.quizzes, 0);

    const now = new Date();
    const discountActive =
      course.discountPercent != null &&
      course.discountPercent > 0 &&
      (course.discountExpiresAt == null || course.discountExpiresAt > now);

    const effectivePrice = (() => {
      if (!course.isPaid) return 0;
      if (!course.price) return 0;
      if (discountActive && course.discountPercent) {
        return +(course.price * (1 - course.discountPercent / 100)).toFixed(2);
      }
      return course.price;
    })();

    const preview = {
      id: course.id,
      title: course.title,
      subject: course.subject,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      educationalStage: course.educationalStage,
      teacher: course.teacher,
      isPaid: course.isPaid,
      price: course.price,
      discountPercent: discountActive ? course.discountPercent : null,
      discountExpiresAt: discountActive ? course.discountExpiresAt : null,
      effectivePrice,
      contactPhone: course.isPaid ? (course.contactPhone ?? null) : null,
      totalVideos,
      totalQuizzes,
      folders: course.folders.map((f) => ({
        id: f.id,
        name: f.name,
        videoCount: f._count.videos,
        quizCount: f._count.quizzes,
      })),
      hasAccess,
    };

    const response = NextResponse.json({ course: preview });
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    return response;
  } catch (error) {
    console.error("Preview API error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحميل بيانات الكورس" }, { status: 500 });
  }
}
