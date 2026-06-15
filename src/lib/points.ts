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

  // Compare CALENDAR DAYS, not exact timestamps. Normalizing both sides to
  // local start-of-day makes the "already counted today" guard robust even if
  // lastLoginDate carries a stray time component (older data / manual edits) —
  // which was causing points to be re-awarded on every login the same day.
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(new Date());

  let newStreak = 1;
  let pointsToAward = POINTS.DAILY_LOGIN_STREAK;

  if (user.lastLoginDate) {
    const dayDiff = Math.round((todayStart - startOfDay(new Date(user.lastLoginDate))) / 86_400_000);
    if (dayDiff <= 0) {
      // Already counted today (0) — or clock skew (negative). Award nothing.
      return;
    } else if (dayDiff === 1) {
      // Consecutive day → streak continues.
      newStreak = user.loginStreak + 1;
      pointsToAward = newStreak * POINTS.DAILY_LOGIN_STREAK;
    } else {
      // Gap of 2+ days → streak resets.
      newStreak = 1;
      pointsToAward = POINTS.DAILY_LOGIN_STREAK;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: pointsToAward },
      loginStreak: newStreak,
      lastLoginDate: new Date(todayStart),
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
