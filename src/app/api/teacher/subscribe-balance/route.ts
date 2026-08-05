import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولاً لشراء الاشتراك بالرصيد" }, { status: 401 });
    }

    const { teacherId, planType, language: requestedLang } = await req.json().catch(() => ({}));

    if (!teacherId || typeof teacherId !== "string") {
      return NextResponse.json({ error: "معرف الأستاذ مطلوب" }, { status: 400 });
    }

    const validPlanTypes = ["monthly", "termly", "yearly", "1month", "3months", "6months"];
    if (!planType || !validPlanTypes.includes(planType)) {
      return NextResponse.json({ error: "نوع الباقة غير صحيح" }, { status: 400 });
    }

    const profile = await prisma.teacherProfile.findUnique({
      where: { teacherId },
    });

    if (!profile) {
      return NextResponse.json({ error: "لم يتم العثور على الأستاذ" }, { status: 400 });
    }

    if (profile.bookingEnabled === false) {
      return NextResponse.json({ error: "عفواً، الحجز مغلق حالياً مع هذا الأستاذ" }, { status: 403 });
    }

    const isLanguages = requestedLang === "languages";
    if (isLanguages && profile.languagesEnabled === false) {
      return NextResponse.json({ error: "هذا المعلم متاح للحجز باللغة العربية فقط" }, { status: 400 });
    }
    if (!isLanguages && profile.arabicEnabled === false) {
      return NextResponse.json({ error: "هذا المعلم متاح للحجز لغات فقط" }, { status: 400 });
    }

    // Map 1month, 3months, 6months (and legacy types) to prices
    let numAmount: number | null = null;
    let durationDays = 30;
    let label = "اشتراك شهري";

    if (planType === "1month" || planType === "monthly") {
      if (profile.enableMonthly1 === false) {
        return NextResponse.json({ error: "خطة شهر واحد غير مفعّلة لدى المعلم" }, { status: 400 });
      }
      const base = profile.priceMonthly1 ?? profile.priceMonthly ?? 200;
      const surcharge = isLanguages ? (profile.langSurcharge1 ?? 50) : 0;
      numAmount = base + surcharge;
      durationDays = 30;
      label = isLanguages ? "اشتراك 1 شهر (لغات)" : "اشتراك 1 شهر (عربي)";
    } else if (planType === "3months" || planType === "termly") {
      if (profile.enableMonthly3 === false) {
        return NextResponse.json({ error: "خطة 3 شهور غير مفعّلة لدى المعلم" }, { status: 400 });
      }
      const base = profile.priceMonthly3 ?? profile.priceTermly ?? 500;
      const surcharge = isLanguages ? (profile.langSurcharge3 ?? 150) : 0;
      numAmount = base + surcharge;
      durationDays = 90;
      label = isLanguages ? "اشتراك 3 شهور (لغات)" : "اشتراك 3 شهور (عربي)";
    } else if (planType === "6months" || planType === "yearly") {
      if (profile.enableMonthly6 === false) {
        return NextResponse.json({ error: "خطة 6 شهور غير مفعّلة لدى المعلم" }, { status: 400 });
      }
      const base = profile.priceMonthly6 ?? profile.priceYearly ?? 1000;
      const surcharge = isLanguages ? (profile.langSurcharge6 ?? 300) : 0;
      numAmount = base + surcharge;
      durationDays = 180;
      label = isLanguages ? "اشتراك 6 شهور (لغات)" : "اشتراك 6 شهور (عربي)";
    }

    if (numAmount == null) {
      return NextResponse.json({ error: "هذه الباقة غير متوفرة" }, { status: 400 });
    }

    const teacherName = profile.displayName || profile.slug;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, balance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    if (user.balance < numAmount) {
      return NextResponse.json(
        {
          error: `رصيدك الحالي (${user.balance} جنيه) لا يكفي لشراء الاشتراك (${numAmount} جنيه). يرجى شحن رصيدك أولاً.`,
        },
        { status: 400 }
      );
    }

    const userDetails = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true, phone: true, parentPhone: true, educationalStage: true },
    });

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: session.id },
        data: { balance: { decrement: numAmount } },
      });

      await tx.balanceTransaction.create({
        data: {
          userId: session.id,
          type: "debit_purchase",
          amount: -numAmount,
          note: `حجز اشتراك (${label}) - أستاذ ${teacherName || "المعلم"}`,
        },
      });

      await tx.teacherSubscription.upsert({
        where: {
          studentId_teacherId_planType: {
            studentId: session.id,
            teacherId: teacherId,
            planType: planType,
          },
        },
        create: {
          studentId: session.id,
          teacherId: teacherId,
          planType: planType,
          planLabel: label,
          language: isLanguages ? "languages" : "arabic",
          amount: numAmount,
          educationalStage: userDetails?.educationalStage,
          studentName: userDetails?.name,
          studentPhone: userDetails?.phone,
          parentPhone: userDetails?.parentPhone,
          status: "active",
          expiresAt: expiresAt,
        },
        update: {
          planLabel: label,
          language: isLanguages ? "languages" : "arabic",
          amount: numAmount,
          educationalStage: userDetails?.educationalStage,
          studentName: userDetails?.name,
          studentPhone: userDetails?.phone,
          parentPhone: userDetails?.parentPhone,
          status: "active",
          expiresAt: expiresAt,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `تم الشراء وحجز الاشتراك بنجاح! خُصم ${numAmount} جنيه من رصيدك. رصيدك الحالي: ${updatedUser.balance} جنيه.`,
      newBalance: updatedUser.balance,
    });
  } catch (error: any) {
    console.error("[subscribe-balance] error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء خصم الرصيد" }, { status: 500 });
  }
}
