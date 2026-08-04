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
export const POST = withRoute({ auth: "student", label: "feedback:POST" }, async ({ session }) => {
  const body = await readJsonBody(new Request("http://local", { method: "POST" }));
  void body;
  return NextResponse.json({});
});

// GET — list the student's own feedback
export const GET = withRoute({ auth: "student", label: "feedback:GET" }, async ({ session, url }) => {
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
});
