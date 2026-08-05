import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { OtpService } from "@/services/otp/OtpService";

function hasValidCronSecret(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function POST(req: NextRequest) {
  try {
    if (!hasValidCronSecret(req.headers.get("authorization"))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const result = await OtpService.processQueuedOtps(25);
    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron OTP Process Error]:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء معالجة قائمة الانتظار" }, { status: 500 });
  }
}
