import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const subject = searchParams.get("subject");
    const teacherId = searchParams.get("teacher");

    const where: Record<string, unknown> = {};
    if (stage) where.educationalStage = stage;
    if (subject) where.subject = subject;
    if (teacherId) where.teacherId = teacherId;

    const session = await getStudentSession();

    if (session) {
      // Find the user to get their educationalStage
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { educationalStage: true },
      });
      // Restrict courses by student's stage unless they explicitly ask for another stage via query params
      // Wait, the prompt says "Restrict GET /api/courses to logged-in student's educationalStage." 
      // If we hardcode it, they can't even browse other stages. Let's enforce it completely if they are logged in.
      if (user?.educationalStage) {
        where.educationalStage = user.educationalStage;
      }
    }

    const courses = await prisma.course.findMany({
      where,
      include: { teacher: { select: { id: true, name: true } }, _count: { select: { accessCodes: true } } },
      orderBy: { createdAt: "desc" },
      // allowDirectInstall is needed so CourseCard can show the install button
    });

    if (!session) {
      const response = NextResponse.json({ courses: courses.map((course) => ({ ...course, hasAccess: false })) });
      response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      return response;
    }

    const accessCodes = await prisma.accessCode.findMany({
      where: {
        studentId: session.id,
        courseId: { in: courses.map((course) => course.id) },
      },
      select: { courseId: true },
    });

    const accessMap = new Set(accessCodes.map((code) => code.courseId));
    const coursesWithAccess = courses.map((course) => ({ ...course, hasAccess: accessMap.has(course.id) }));

    const response = NextResponse.json({ courses: coursesWithAccess });
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    return response;
  } catch (error) {
    console.error("Courses API error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحميل الكورسات" }, { status: 500 });
  }
}
