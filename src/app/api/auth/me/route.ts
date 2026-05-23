import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clearAuthCookie, getSession, getStudentSessionWithRetry } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    // Clerk student pages must not pick up teacher admin JWT from the same browser
    if (userId) {
      const studentSession = await getStudentSessionWithRetry(3, 100);
      if (studentSession) {
        return NextResponse.json({ user: studentSession });
      }
    }

    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        user: null,
        clerkSignedIn: Boolean(userId),
      });
    }

    return NextResponse.json({ user: session });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    const { userId } = await auth();
    return NextResponse.json({
      user: null,
      clerkSignedIn: Boolean(userId),
      dbError: true,
    });
  }
}

export async function DELETE() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (session.clerkId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: session.clerkId },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await prisma.user.delete({ where: { id: user.id } });
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    await clearAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
