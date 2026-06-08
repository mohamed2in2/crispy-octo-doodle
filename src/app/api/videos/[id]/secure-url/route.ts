import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { getVdoCipherOtp } from "@/lib/vdocipher";
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
    const vdoData = await getVdoCipherOtp(video.vdoCipherId);

    return NextResponse.json({
      embedUrl: vdoData.embedUrl,
      fallbackEmbedUrl: null,
      signed: true,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    console.error("VdoCipher embed URL error:", error);
    return NextResponse.json(
      { error: "تعذر إنشاء رابط فيديو آمن. تأكد من إعدادات VdoCipher في البيئة." },
      { status: 500 }
    );
  }
}
