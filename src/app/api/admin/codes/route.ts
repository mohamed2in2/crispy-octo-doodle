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
      if (!session || session.role !== "teacher") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

      const { courseId, count = 1 } = await req.json();
      if (!courseId) return NextResponse.json({ error: "courseId مطلوب" }, { status: 400 });

      const course = await prisma.course.findFirst({ where: { id: courseId, teacherId: session.id } });
      if (!course) return NextResponse.json({ error: "الكورس غير موجود" }, { status: 404 });

      const codes = await Promise.all(
        Array.from({ length: count }, async () => {
          const code = crypto.randomBytes(4).toString("hex").toUpperCase();
          return prisma.accessCode.create({ data: { code, courseId } });
        })
      );

      return NextResponse.json({ codes }, { status: 201 });
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
