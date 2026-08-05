import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface ProcessAttributionInput {
  studentId: string;
  teacherIdOfContent: string;
  amount: number;
  purchaseType: "COURSE" | "FOLDER" | "VIDEO";
  courseId?: string;
  folderId?: string;
  videoId?: string;
  promoCodeInput?: string | null;
  tx?: Prisma.TransactionClient;
}

/** Attributes eligible purchase revenue to the teacher who owns the content. */
export async function processTeacherAttribution(input: ProcessAttributionInput): Promise<void> {
  const db = input.tx ?? prisma;
  const { studentId, teacherIdOfContent, amount, purchaseType, courseId, folderId, videoId, promoCodeInput } = input;
  if (amount <= 0 || !teacherIdOfContent) return;

  const now = new Date();
  const promoExpiryMs = 350 * 24 * 60 * 60 * 1000;
  if (promoCodeInput) {
    const codeUpper = promoCodeInput.trim().toUpperCase();
    const promoTeacher = await db.user.findFirst({
      where: { role: "teacher", promoProgramEnabled: true, promoCode: codeUpper },
      select: { id: true, promoCodeCreatedAt: true },
    });
    if (promoTeacher?.id === teacherIdOfContent && promoTeacher.promoCodeCreatedAt && now.getTime() - promoTeacher.promoCodeCreatedAt.getTime() <= promoExpiryMs) {
      await db.teacherReferralAttribution.create({ data: { teacherId: promoTeacher.id, studentId, purchaseType, courseId, folderId, videoId, amount, promoCodeUsed: codeUpper } });
      return;
    }
  }

  const student = await db.user.findUnique({ where: { id: studentId }, select: { referredByTeacherId: true } });
  if (student?.referredByTeacherId !== teacherIdOfContent) return;
  const referringTeacher = await db.user.findUnique({ where: { id: teacherIdOfContent }, select: { id: true, promoProgramEnabled: true } });
  if (referringTeacher?.promoProgramEnabled) {
    await db.teacherReferralAttribution.create({ data: { teacherId: referringTeacher.id, studentId, purchaseType, courseId, folderId, videoId, amount } });
  }
}
