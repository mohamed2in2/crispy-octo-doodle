import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/rbac";

/**
 * Clears a student's registered devices so they can sign in from a new device
 * (e.g. changed phone). Allowed for superadmin/admin/staff, or a teacher who has
 * the student enrolled in one of their courses.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id: studentId } = await params;

  let allowed = isAdminRole(session.role);
  if (!allowed && session.role === "teacher") {
    const enrolled = await prisma.accessCode.findFirst({
      where: { studentId, course: { teacherId: session.id } },
      select: { id: true },
    });
    allowed = !!enrolled;
  }
  if (!allowed) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { count } = await prisma.device.deleteMany({ where: { userId: studentId } });
  return NextResponse.json({ success: true, cleared: count });
}
