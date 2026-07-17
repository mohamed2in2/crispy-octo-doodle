import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");

    const where: Record<string, unknown> = {
      status: "published",
    };
    if (stage) where.educationalStage = stage;

    const session = await getStudentSession();

    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { educationalStage: true },
      });
      if (user?.educationalStage) {
        where.educationalStage = user.educationalStage;
      }
    }

    // Fetch plans with lesson counts
    const plans = await prisma.plan.findMany({
      where,
      include: {
        _count: { select: { lessons: true } },
      },
      orderBy: [
        { educationalStage: "asc" },
        { monthIndex: "asc" },
      ],
    });

    if (!session) {
      const response = NextResponse.json({ 
        plans: plans.map((plan) => {
          let effectivePrice = plan.price;
          if (plan.discountPrice !== null && plan.discountExpiresAt && new Date(plan.discountExpiresAt) > new Date()) {
            effectivePrice = plan.discountPrice;
          }
          return {
            ...plan,
            effectivePrice,
            hasAccess: false
          };
        }) 
      });
      response.headers.set("Cache-Control", "public, max-age=300");
      return response;
    }

    const enrollments = await prisma.planEnrollment.findMany({
      where: {
        studentId: session.id,
        planId: { in: plans.map((plan) => plan.id) },
      },
      select: { planId: true },
    });

    const accessMap = new Set(enrollments.map((e) => e.planId));
    const plansWithAccess = plans.map((plan) => {
      let effectivePrice = plan.price;
      if (plan.discountPrice !== null && plan.discountExpiresAt && new Date(plan.discountExpiresAt) > new Date()) {
        effectivePrice = plan.discountPrice;
      }
      return {
        ...plan,
        effectivePrice,
        hasAccess: accessMap.has(plan.id)
      };
    });

    const response = NextResponse.json({ plans: plansWithAccess });
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
    return response;
  } catch (error) {
    console.error("Plans API error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحميل الخطط" }, { status: 500 });
  }
}
