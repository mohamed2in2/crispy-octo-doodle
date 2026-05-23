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

    const enrolledCourses = await prisma.course.findMany({
      where: {
        accessCodes: {
          some: {
            studentId: session.id,
          },
        },
      },
      include: {
        teacher: { select: { id: true, name: true } },
        folders: {
          include: {
            videos: true,
            quizzes: true,
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { accessCodes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get student's progress
    const progress = await prisma.progress.findMany({
      where: { studentId: session.id },
      select: { videoId: true, watched: true },
    });

    const progressMap = new Map(progress.map(p => [p.videoId, p.watched]));

    // Add progress info to folders
    const coursesWithProgress = enrolledCourses.map(course => ({
      id: course.id,
      title: course.title,
      subject: course.subject,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      educationalStage: course.educationalStage,
      teacher: course.teacher,
      folders: course.folders.map(folder => ({
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
      })),
      totalVideos: course.folders.reduce((sum, f) => sum + f.videos.length, 0),
      watchedVideos: Array.from(progressMap.values()).filter(Boolean).length,
    }));

    return NextResponse.json(
      {
        success: true,
        enrolledCourses: coursesWithProgress,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
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
