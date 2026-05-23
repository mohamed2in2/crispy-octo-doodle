import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { buildBunnyEmbedUrl, isBunnyEmbedSigningEnabled } from "@/lib/bunny-stream";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      folder: {
        include: {
          course: {
            select: { id: true, teacherId: true },
          },
        },
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
  }

  const course = video.folder.course;
  const isSuperadmin = session.role === "superadmin";
  const canAccessAsTeacher = session.role === "teacher" && course.teacherId === session.id;
  const canAccessAsStudent =
    session.role === "student"
      ? await prisma.accessCode.findFirst({
          where: {
            courseId: course.id,
            studentId: session.id,
            isActive: true,
          },
          select: { id: true },
        })
      : null;

  if (!isSuperadmin && !canAccessAsTeacher && !canAccessAsStudent) {
    return NextResponse.json(
      { error: "لا يوجد صلاحية للوصول. فعّل كود الكورس من صفحة الكورسات أولاً." },
      { status: 403 }
    );
  }

  try {
    const signed = isBunnyEmbedSigningEnabled();
    const embedUrl = buildBunnyEmbedUrl(video.bunnyId, signed);
    const fallbackEmbedUrl = signed ? buildBunnyEmbedUrl(video.bunnyId, false) : null;

    return NextResponse.json({
      embedUrl,
      fallbackEmbedUrl: signed ? fallbackEmbedUrl : null,
      signed,
      expiresInSeconds: signed ? 3600 : null,
    });
  } catch (error) {
    console.error("Bunny embed URL error:", error);
    return NextResponse.json(
      { error: "تعذر إنشاء رابط فيديو آمن. تأكد من إعدادات Bunny Stream في البيئة." },
      { status: 500 }
    );
  }
}
