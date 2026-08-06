import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logAdminAction, verifyMasterPassword } from "@/lib/admin-auth";
import { getSession, setAuthCookie, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function rateLimitKey(req: NextRequest): string | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

export async function POST(req: NextRequest) {
  const previousSession = await getSession();
  if (previousSession?.role === "superadmin") {
    try {
      await logAdminAction({ adminId: previousSession.id, adminName: previousSession.name, action: "SUPERADMIN_ACTION", targetType: "API_ROUTE", targetId: req.nextUrl.pathname, targetName: req.method });
    } catch {
      // Optional audit persistence must not make an already-authenticated login unavailable.
    }
  }

  try {
    const limiter = rateLimitKey(req);
    const today = new Date().toISOString().slice(0, 10);
    const failedTriesKey = limiter ? `admin_failed_logins_${today}_${limiter}` : null;
    const current = failedTriesKey ? await prisma.appSetting.findUnique({ where: { key: failedTriesKey } }) : null;
    const currentTries = current ? Number.parseInt(current.value, 10) || 0 : 0;
    if (currentTries >= 30) return NextResponse.json({ error: "تم تجاوز الحد الأقصى لمحاولات الدخول الفاشلة اليوم" }, { status: 429 });
    const recordFailedAttempt = async () => {
      if (!failedTriesKey) return;
      await prisma.appSetting.upsert({
        where: { key: failedTriesKey },
        update: { value: String(currentTries + 1) },
        create: { key: failedTriesKey, value: String(currentTries + 1) },
      });
    };

    const body = (await req.json()) as { role?: string; name?: string; email?: string; password?: string };
    const role = body.role;
    const password = body.password ?? "";
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";

    if (role === "superadmin") {
      if (!password) return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
      if (verifyMasterPassword(password)) {
        let owner = await prisma.user.findFirst({ where: { role: "superadmin", isOwner: true, isActive: true, isDeleted: false } });
        if (!owner) {
          owner = await prisma.user.findFirst({ where: { role: "superadmin", isActive: true, isDeleted: false } });
        }
        if (!owner) {
          owner = await prisma.user.create({
            data: {
              name: "المشرف العام",
              email: "owner@code-up.tech",
              role: "superadmin",
              isOwner: true,
              isActive: true,
            },
          });
        }
        const token = await signToken({ id: owner.id, email: owner.email, name: owner.name, role: "superadmin", isOwner: owner.isOwner ?? true });
        await setAuthCookie(token);
        return NextResponse.json({ user: { id: owner.id, name: owner.name, role: "superadmin", isOwner: owner.isOwner ?? true } });
      }

      const superadmins = await prisma.user.findMany({ where: { role: "superadmin", isActive: true, isDeleted: false } });
      for (const admin of superadmins) {
        if (admin.password && await bcrypt.compare(password, admin.password)) {
          const token = await signToken({ id: admin.id, email: admin.email, name: admin.name, role: "superadmin", isOwner: admin.isOwner });
          await setAuthCookie(token);
          return NextResponse.json({ user: { id: admin.id, name: admin.name, role: "superadmin", isOwner: admin.isOwner } });
        }
      }
      await recordFailedAttempt();
      return NextResponse.json({ error: "كلمة المرور الرئيسية غير صحيحة" }, { status: 401 });
    }

    if (role === "teacher") {
      if (!name || !password) return NextResponse.json({ error: "الاسم وكلمة المرور مطلوبان" }, { status: 400 });
      const teacher = await prisma.user.findFirst({ where: { name, role: "teacher", isDeleted: false } });
      if (!teacher?.password || !await bcrypt.compare(password, teacher.password)) {
        await recordFailedAttempt();
        return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
      }
      if (!teacher.isActive) return NextResponse.json({ error: "هذا الحساب موقوف. تواصل مع المشرف العام" }, { status: 403 });
      const token = await signToken({ id: teacher.id, email: teacher.email, name: teacher.name, role: "teacher" });
      await setAuthCookie(token);
      return NextResponse.json({ user: { id: teacher.id, name: teacher.name, role: "teacher" } });
    }

    if (role === "staff_portal") {
      if (!email || !password) return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
      const user = await prisma.user.findFirst({ where: { email, role: { in: ["admin", "staff"] }, isDeleted: false } });
      if (!user?.password || !await bcrypt.compare(password, user.password)) {
        await recordFailedAttempt();
        return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
      }
      if (!user.isActive) return NextResponse.json({ error: "هذا الحساب موقوف. تواصل مع المشرف العام" }, { status: 403 });
      const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
      await setAuthCookie(token);
      return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
    }
    return NextResponse.json({ error: "دور غير صحيح" }, { status: 400 });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
