/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getConfigNumberClamped } from "@/lib/config";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { id } = await params;

    // Course-entry access by role:
    //  - student            → must be enrolled
    //  - admin / superadmin → allowed (oversight / preview), no enrollment
    //  - teacher            → blocked with a clear "you're a teacher" message
    //  - staff              → blocked
    const role = session.role;
    if (role === "teacher") {
      return NextResponse.json(
        {
          error: "أنت مُعلّم — صفحة دخول الكورس مخصّصة للطلاب فقط. تابع كورساتك من لوحة المعلّم.",
          code: "TEACHER_NOT_ALLOWED",
        },
        { status: 403 }
      );
    }
    if (role === "staff") {
      return NextResponse.json(
        { error: "هذه الصفحة مخصّصة للطلاب فقط.", code: "STAFF_NOT_ALLOWED" },
        { status: 403 }
      );
    }
    if (role === "student") {
      const access = await prisma.accessCode.findFirst({
        where: { courseId: id, studentId: session.id },
      });
      if (!access) {
        return NextResponse.json(
          { error: "لا يوجد صلاحية للوصول. فعّل كود الكورس أو تواصل مع المعلم.", code: "NOT_ENROLLED" },
          { status: 403 }
        );
      }
    }
    // admin / superadmin fall through — full read access.

    const course = await prisma.course.findFirst({
      where: { id, teacher: { isDeleted: false } },
      include: {
        teacher: { select: { id: true, name: true } },
        folders: {
          orderBy: { order: "asc" },
          include: {
            videos: {
              orderBy: { order: "asc" },
              include: {
                progress: {
                  where: { studentId: session.id },
                  select: { watched: true, watchedAt: true, lastPositionSeconds: true },
                },
                watchSessions: {
                  where: { studentId: session.id, usedWatchSlot: true },
                  select: { id: true },
                },
              },
            },
            materials: { orderBy: { order: "asc" } },
            quizzes: {
              select: ({
                id: true,
                title: true,
                timeLimitMinutes: true,
                questions: { orderBy: { order: "asc" } },
              } as any),
            },
          },
        },
      },
    });

    if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

    const safeCourse = {
      ...course,
      homeworkUrl: course.homeworkUrl,
      maxWatchCount: course.maxWatchCount,
      folders: course.folders.map((folder) => ({
        ...folder,
        // folder.publishAt is kept so the learn page can compute the unlock time.
        videos: folder.videos.map((video) => ({
          ...video,
          // publishAt kept (used by the learn page); sensitive provider IDs stripped.
          vdoCipherId: undefined,
          providerVideoId: undefined,
          usedWatches: video.watchSessions.length,
          watchSessions: undefined,
        })),
        quizzes: folder.quizzes.map((quiz) => {
          const q = quiz as unknown as {
            id: string;
            title: string;
            timeLimitMinutes: number;
            questions?: Array<{ correctAnswer?: string; [key: string]: unknown }>;
          };
          return {
            id: q.id,
            title: q.title,
            timeLimitMinutes: q.timeLimitMinutes,
            questions: (q.questions ?? []).map((question) => ({ ...question, correctAnswer: undefined })),
          };
        }),
      })),
    };

    // Mark-complete gate (% watched) is superadmin-configurable (was 80).
    const markCompleteThreshold = await getConfigNumberClamped("mark_complete_threshold", 1, 100);
    return NextResponse.json({ course: safeCourse, markCompleteThreshold });
  } catch (error) {
    console.error("[courses/[id]] error:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
