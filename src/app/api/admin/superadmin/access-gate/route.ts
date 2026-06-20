import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyBulkPassword } from "@/lib/admin-auth";

/**
 * Verifies the access password (BULK_DELETE_PASSWORD) that gates the Danger Zone
 * and Instance sections. Superadmin-only; returns only { ok } — never the value.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!verifyBulkPassword(body.password ?? "")) {
    return NextResponse.json({ ok: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
