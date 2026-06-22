import { logAdminAction } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: NextRequest) {

      try {
      const session = await getSession();
      if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

      const { searchParams } = new URL(req.url);
      const courseId = searchParams.get("courseId");
      if (!courseId) return NextResponse.json({ error: "courseId مطلوب" }, { status: 400 });

      const codes = await prisma.accessCode.findMany({
        where: { courseId, course: { teacherId: session.id } },
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ codes });
    } catch (error) {
        console.error("[admin/codes] error:", error);
        return NextResponse.json(
          { error: "حدث خطأ داخلي" },
          { status: 500 }
        );
      }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (session && session.role === "superadmin") {
      try {
        await logAdminAction({
          adminId: session.id,
          adminName: session.name,
          action: "SUPERADMIN_ACTION",
          targetType: "API_ROUTE",
          targetId: req.nextUrl ? req.nextUrl.pathname : req.url,
          targetName: req.method,
        });
      } catch (e) {}
    }
    if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { courseId, prefix } = body;
    const count = Math.min(Math.max(1, Math.floor(Number(body.count) || 1)), 200);

    if (!courseId) return NextResponse.json({ error: "courseId مطلوب" }, { status: 400 });

    const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: session.id } });
    if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

    const cleanPrefix = prefix ? String(prefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) : "";

    const createdCodes: any[] = [];
    for (let i = 0; i < count; i++) {
      let code = "";
      let exists = true;
      let attempts = 0;
      while (exists && attempts < 20) {
        attempts++;
        const hex = crypto.randomBytes(4).toString("hex").toUpperCase();
        code = cleanPrefix ? `${cleanPrefix}-${hex}` : hex;
        // Check local batch and DB
        if (!createdCodes.some(c => c.code === code)) {
          const dbExists = await prisma.accessCode.findUnique({ where: { code }, select: { id: true } });
          if (!dbExists) {
            exists = false;
          }
        }
      }
      if (exists) {
        return NextResponse.json({ error: "تعذر إنشاء كود فريد — حاول مجدداً" }, { status: 409 });
      }
      const created = await prisma.accessCode.create({ data: { code, courseId } });
      createdCodes.push(created);
    }

    return NextResponse.json({ codes: createdCodes }, { status: 201 });
  } catch (error) {
    console.error("[admin/codes] error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {

      try {
      const session = await getSession();

    if (session && session.role === "superadmin") {
      try {
        await logAdminAction({
          adminId: session.id,
          adminName: session.name,
          action: "SUPERADMIN_ACTION",
          targetType: "API_ROUTE",
          targetId: req.nextUrl ? req.nextUrl.pathname : req.url,
          targetName: req.method,
        });
      } catch (e) {}
    }
      if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

      const { codeId, isActive } = await req.json();
      const code = await prisma.accessCode.findFirst({
        where: { id: codeId, course: { teacherId: session.id } },
      });
      if (!code) return NextResponse.json({ error: "الكود غير موجود" }, { status: 404 });

      if (isActive === true && !!code.usedAt) {
        return NextResponse.json({ error: "لا يمكن إعادة تفعيل كود تم استخدامه من قبل" }, { status: 400 });
      }

      const updated = await prisma.accessCode.update({
        where: { id: codeId },
        data: { isActive },
      });
      return NextResponse.json({ code: updated });
    } catch (error) {
        console.error("[admin/codes] error:", error);
        return NextResponse.json(
          { error: "حدث خطأ داخلي" },
          { status: 500 }
        );
      }
}
