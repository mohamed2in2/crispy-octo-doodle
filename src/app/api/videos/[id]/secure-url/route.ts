import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { buildBunnyEmbedUrl, isBunnyEmbedSigningEnabled } from "@/lib/bunny-stream";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (session.role === "student" && !token) {
    return NextResponse.json({ error: "يجب بدء جلسة مشاهدة أولاً" }, { status: 403 });
  }

  if (token) {
    const watchSession = await prisma.videoWatchSession.findUnique({
      where: { sessionToken: token },
      include: {
        video: {
          include: {
            folder: {
              select: {
                course: { select: { id: true, teacherId: true } },
              },
            },
          },
        },
      },
    });

    if (!watchSession) {
      return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
    }

    if (watchSession.studentId !== session.id) {
      return NextResponse.json({ error: "غير مصرح بهذه الجلسة" }, { status: 403 });
    }

    if (watchSession.videoId !== id) {
      return NextResponse.json({ error: "الفيديو لا يتطابق مع الجلسة" }, { status: 400 });
    }

    if (watchSession.expiresAt < new Date()) {
      return NextResponse.json({ error: "انتهت جلسة المشاهدة" }, { status: 403 });
    }
  }

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
