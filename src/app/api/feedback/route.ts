import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/api/handler";
import { forbidden, notFound } from "@/lib/api/errors";
import {
  optionalInt,
  optionalQueryParam,
  readJsonBody,
  requireEnum,
  requireId,
  requireString,
} from "@/lib/api/validate";

/**
 * Feedback types accepted by this endpoint.
 *
 * Mirrors FEEDBACK_TYPES in src/components/ai/CourseFeedbackForm.tsx, the only
 * caller. The database column is plain TEXT, so this list is the only thing
 * preventing arbitrary strings from being stored as feedback types.
 */
const FEEDBACK_TYPES = [
  "teacher_rating",
  "course_feedback",
  "took_elsewhere",
  "difficulty",
  "other",
] as const;

/** The form enforces a 10-character minimum client-side; mirror it server-side. */
const CONTENT_MIN = 10;
const CONTENT_MAX = 5_000;

// POST — student submits feedback on a course they are enrolled in
export const POST = withRoute(
  { auth: "student", label: "feedback:POST" },
  async ({ req, session }) => {
    const body = await readJsonBody(req);

    const courseId = requireId(body, "courseId");
    const type = requireEnum(body, "type", FEEDBACK_TYPES);
    const content = requireString(body, "content", {
      min: CONTENT_MIN,
      max: CONTENT_MAX,
    });

    // The form only sends a rating for teacher_rating and sends null otherwise,
    // so ignore any rating supplied with the other types rather than storing it.
    const rating =
      type === "teacher_rating"
        ? optionalInt(body, "rating", { min: 1, max: 5 })
        : undefined;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (!course) {
      throw notFound("\u0627\u0644\u0643\u0648\u0631\u0633 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f");
    }

    // Enrolment check: the student must hold a redeemed access code for the course.
    const access = await prisma.accessCode.findFirst({
      where: { courseId, studentId: session.id },
    });
    if (!access) {
      throw forbidden(
        "\u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0645\u0633\u062c\u0644\u0627\u064b \u0641\u064a \u0627\u0644\u0643\u0648\u0631\u0633 \u0644\u062a\u0642\u062f\u064a\u0645 \u0645\u0644\u0627\u062d\u0638\u0627\u062a"
      );
    }

    const feedback = await prisma.studentFeedback.create({
      data: {
        studentId: session.id,
        courseId,
        teacherId: course.teacherId,
        type,
        content,
        rating: rating ?? null,
      },
    });

    return NextResponse.json({
      feedback,
      message:
        "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0645\u0644\u0627\u062d\u0638\u062a\u0643 \u0628\u0646\u062c\u0627\u062d",
    });
  }
);

// GET — list the student's own feedback
export const GET = withRoute(
  { auth: "student", label: "feedback:GET" },
  async ({ session, url }) => {
    const courseId = optionalQueryParam(url, "courseId");

    const feedback = await prisma.studentFeedback.findMany({
      where: {
        studentId: session.id,
        ...(courseId ? { courseId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { title: true } },
        teacher: { select: { name: true } },
      },
    });

    return NextResponse.json({ feedback });
  }
);
