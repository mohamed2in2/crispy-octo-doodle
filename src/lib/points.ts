import { prisma } from "@/lib/prisma";

export const POINTS = {
  EXAM_FULL_SCORE: 50,
  COURSE_ENROLLMENT: 20,
  DAILY_LOGIN_STREAK: 5, // per day
  FIRST_TRY_BONUS: 15,
  DAILY_EXAM_QUESTION: 5, // 5 points per correct daily exam question
  DAILY_EXAM_FULL_SCORE: 10, // 10 points bonus for perfect daily exam score
};

/**
 * Awards points to a user and updates their pointsUpdatedAt timestamp.
 * If the streak is broken (lastLoginDate is not yesterday), the streak is reset.
 */
export async function awardDailyLoginPoints(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let newStreak = 1;
  let pointsToAward = 0;

  if (user.lastLoginDate) {
    const lastLogin = new Date(user.lastLoginDate);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastLogin.getTime() === today.getTime()) {
      // Already logged in today, do nothing
      return;
    } else if (lastLogin.getTime() === yesterday.getTime()) {
      // Streak continues
      newStreak = user.loginStreak + 1;
      pointsToAward = newStreak * POINTS.DAILY_LOGIN_STREAK;
    } else {
      // Streak broken
      newStreak = 1;
      pointsToAward = POINTS.DAILY_LOGIN_STREAK;
    }
  } else {
    // First ever login recorded
    newStreak = 1;
    pointsToAward = POINTS.DAILY_LOGIN_STREAK;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: pointsToAward },
      loginStreak: newStreak,
      lastLoginDate: today,
      pointsUpdatedAt: new Date(),
    },
  });
}

/**
 * Awards points for completing a daily exam.
 * @param userId Student ID
 * @param score Number of correct answers
 * @param totalQ Total number of questions
 */
export async function awardDailyExamPoints(userId: string, score: number, totalQ: number) {
  // Balanced points: 5 points per correct answer + 10 points bonus for perfect score
  let pointsToAward = score * POINTS.DAILY_EXAM_QUESTION;
  if (score === totalQ && totalQ > 0) {
    pointsToAward += POINTS.DAILY_EXAM_FULL_SCORE;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: pointsToAward },
      pointsUpdatedAt: new Date(),
    },
  });
}

/**
 * General purpose point award function.
 */
export async function addPoints(userId: string, points: number) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: points },
      pointsUpdatedAt: new Date(),
    },
  });
}
