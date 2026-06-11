import { NextResponse } from "next/server";
import { clearAuthCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      await clearAuthCookie();
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: session }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ user: null, dbError: true });
  }
}

export async function DELETE() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }

    await clearAuthCookie();

    return NextResponse.json({ success: true }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
