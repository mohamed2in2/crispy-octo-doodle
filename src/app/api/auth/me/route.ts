import { NextResponse } from "next/server";
import { clearAuthCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndUpdateStreak } from "@/lib/streak-middleware";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      await clearAuthCookie();
      return NextResponse.json({ user: null });
    }

    // Lightweight streak check: runs on first authenticated request of the day.
    // Fire-and-forget — don't block the /me response on streak DB writes.
    if (session.role === "student") {
      void checkAndUpdateStreak(session.id).catch(() => {/* non-critical */});
    }

    return NextResponse.json({ user: session }, {
      headers: {
        // 15s private browser cache: subsequent calls within 15s use the cached
        // response, eliminating redundant DB hits from concurrent page components.
        // 'private' ensures CDNs never cache this. Stale-while-revalidate gives a
        // 30s window where the browser serves stale while refreshing in background.
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
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
