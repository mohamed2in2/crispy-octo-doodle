/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getStudentSessionWithRetry } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getStudentSessionWithRetry();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 401 });
    }

    // Get enrolled courses with minimal data first
    const enrolledCourses = await prisma.course.findMany({
      where: {
        accessCodes: {
          some: {
            studentId: session.id,
          },
        },
      },
      select: {
        id: true,
        title: true,
        subject: true,
        description: true,
        thumbnailUrl: true,
        educationalStage: true,
        createdAt: true,
        teacher: { select: { id: true, name: true } },
        folders: {
          select: {
            id: true,
            name: true,
            order: true,
            videos: {
              select: { id: true, title: true, order: true },
            },
            quizzes: {
              select: { id: true, title: true, timeLimitMinutes: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all progress records for this student at once
    const progress = await prisma.progress.findMany({
      where: { studentId: session.id },
      select: { videoId: true, watched: true },
    });

    const progressMap = new Map(progress.map(p => [p.videoId, p.watched]));

    // Build response with corrected progress calculation per course
    const coursesWithProgress = enrolledCourses.map(course => {
      const folders = course.folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        order: folder.order,
        videos: folder.videos.map(video => ({
          id: video.id,
          title: video.title,
          order: video.order,
          watched: progressMap.get(video.id) || false,
        })),
        quizzes: folder.quizzes.map(quiz => ({
          id: quiz.id,
          title: quiz.title,
          timeLimitMinutes: (quiz as any).timeLimitMinutes,
        })),
      }));

      // Calculate totals correctly per course
      const totalVideos = folders.reduce((sum, f) => sum + f.videos.length, 0);
      const watchedVideos = folders.reduce((sum, f) => sum + f.videos.filter((v) => v.watched).length, 0);

      return {
        id: course.id,
        title: course.title,
        subject: course.subject,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        educationalStage: course.educationalStage,
        teacher: course.teacher,
        folders,
        totalVideos,
        watchedVideos,
      };
    });

    return NextResponse.json(
      {
        success: true,
        enrolledCourses: coursesWithProgress,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrolled courses" },
      { status: 500 }
    );
  }
}
