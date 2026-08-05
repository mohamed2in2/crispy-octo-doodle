import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "@/lib/auth";
import { readDeviceId, setDeviceCookie, deviceLabelFromUA } from "@/lib/devices";
import { normalizeEgyptPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { getStudentMaxDevices } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { phone?: string; password?: string; recaptchaToken?: string };
    const captcha = await verifyRecaptchaToken(body.recaptchaToken ?? "", "login");
    if (!captcha.success) {
      console.warn("Login blocked by reCAPTCHA", { score: captcha.score, reasons: captcha.reasons });
      return NextResponse.json({ error: "تم اكتشاف نشاط مشبوه. يرجى المحاولة مرة أخرى." }, { status: 403 });
    }
    if (!body.phone || !body.password) return NextResponse.json({ error: "رقم الهاتف وكلمة المرور مطلوبان" }, { status: 400 });

    const normalizedPhone = normalizeEgyptPhone(String(body.phone));
    const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
    if (!user?.password) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    if (!await bcrypt.compare(body.password, user.password)) return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    if (user.role !== "student") return NextResponse.json({ error: "استخدم لوحة الإدارة لتسجيل الدخول" }, { status: 403 });

    const { deviceId, isNew } = await readDeviceId();
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const known = await prisma.device.findUnique({ where: { userId_deviceId: { userId: user.id, deviceId } } });
    if (known) {
      await prisma.device.update({ where: { id: known.id }, data: { lastSeenAt: new Date(), ipAddress, userAgent } });
    } else {
      const maxDevices = await getStudentMaxDevices();
      if (await prisma.device.count({ where: { userId: user.id } }) >= maxDevices) {
        return NextResponse.json({ error: `لقد سجّلت الدخول من الحد الأقصى للأجهزة المسموح بها (${maxDevices}). تواصل مع معلمك لإعادة ضبط الأجهزة.`, code: "DEVICE_LIMIT" }, { status: 403 });
      }
      await prisma.device.create({ data: { userId: user.id, deviceId, label: deviceLabelFromUA(userAgent), userAgent, ipAddress } });
    }

    const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role, deviceId });
    await setAuthCookie(token);
    if (isNew) await setDeviceCookie(deviceId);
    const { awardDailyLoginPoints } = await import("@/lib/points");
    await awardDailyLoginPoints(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error: unknown) {
    console.error("Login error", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
