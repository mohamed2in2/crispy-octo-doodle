import { prisma } from "./prisma";

interface StudentPointsRow {
  id: string;
  name: string;
  points: number;
  educationalStage: string | null;
}

interface StudentStreakRow {
  id: string;
  name: string;
  loginStreak: number;
  educationalStage: string | null;
}

interface AdminRow {
  id: string;
  name: string;
  points: number;
  loginStreak: number;
  educationalStage: string | null;
  phone: string | null;
  email: string;
  parentPhone: string | null;
  age: number | null;
}

interface LeaderboardUser extends AdminRow {
  pointsUpdatedAt: Date | null;
  lastLoginDate: Date | null;
}

export function getCompetitionTier(stage: string | null): string[] {
  if (!stage) return [];
  if (stage.startsWith("primary")) return ["primary_4", "primary_5", "primary_6"];
  if (stage.startsWith("prep")) return ["prep_1", "prep_2", "prep_3"];
  if (stage.startsWith("sec")) return ["sec_1", "sec_2"];
  return [];
}

export async function refreshLeaderboard(force = false) {
  const now = new Date();
  const lockKey = "leaderboard_lock";
  const lockTimeoutMs = 5 * 60 * 1000;
  const cutoffTime = new Date(now.getTime() - lockTimeoutMs);

  console.log(`[${now.toISOString()}] 🔄 Leaderboard refresh check initiated (force=${force})...`);

  if (!force) {
    await prisma.leaderboardCache.upsert({
      where: { key: lockKey },
      update: {},
      create: {
        key: lockKey,
        data: "lock",
        updatedAt: new Date(0),
      },
    });

    const affected = await prisma.$executeRaw`
      UPDATE "LeaderboardCache"
      SET "updatedAt" = ${now}
      WHERE "key" = ${lockKey}
        AND ("updatedAt" < ${cutoffTime} OR "updatedAt" IS NULL)
    `;

    if (affected === 0) {
      console.log(`[${now.toISOString()}] ⚠️ Another process is already refreshing the leaderboard. Skipping.`);
      return;
    }
    console.log(`[${now.toISOString()}] 🔒 Lock acquired successfully.`);
  }

  try {
    const users: LeaderboardUser[] = await prisma.user.findMany({
      where: { role: "student" },
      select: {
        id: true,
        name: true,
        points: true,
        pointsUpdatedAt: true,
        loginStreak: true,
        lastLoginDate: true,
        educationalStage: true,
        phone: true,
        email: true,
        parentPhone: true,
        age: true,
      },
    });

    console.log(`[${new Date().toISOString()}] Retrieved ${users.length} student users for ranking computation.`);

    const getPointsTime = (user: LeaderboardUser) => (user.pointsUpdatedAt ? new Date(user.pointsUpdatedAt).getTime() : 0);
    const getStreakTime = (user: LeaderboardUser) => (user.lastLoginDate ? new Date(user.lastLoginDate).getTime() : 0);

    const sortPoints = (a: LeaderboardUser, b: LeaderboardUser) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return getPointsTime(a) - getPointsTime(b);
    };

    const sortStreaks = (a: LeaderboardUser, b: LeaderboardUser) => {
      if (b.loginStreak !== a.loginStreak) {
        return b.loginStreak - a.loginStreak;
      }
      return getStreakTime(b) - getStreakTime(a);
    };

    const mapToStudent = (user: LeaderboardUser): StudentPointsRow => ({
      id: user.id,
      name: user.name,
      points: user.points,
      educationalStage: user.educationalStage,
    });

    const mapToStreakStudent = (user: LeaderboardUser): StudentStreakRow => ({
      id: user.id,
      name: user.name,
      loginStreak: user.loginStreak,
      educationalStage: user.educationalStage,
    });

    const mapToAdmin = (user: LeaderboardUser): AdminRow => ({
      id: user.id,
      name: user.name,
      points: user.points,
      loginStreak: user.loginStreak,
      educationalStage: user.educationalStage,
      phone: user.phone,
      email: user.email,
      parentPhone: user.parentPhone,
      age: user.age,
    });

    const primaryUsers = users.filter((user) => getCompetitionTier(user.educationalStage).length > 0 && user.educationalStage?.startsWith("primary"));
    const prepUsers = users.filter((user) => getCompetitionTier(user.educationalStage).length > 0 && user.educationalStage?.startsWith("prep"));
    const secUsers = users.filter((user) => getCompetitionTier(user.educationalStage).length > 0 && user.educationalStage?.startsWith("sec"));
    const allUsers = users;

    const topStudentsAdmin = allUsers.filter((user) => user.points > 0).sort(sortPoints).slice(0, 10).map(mapToAdmin);
    const topStudentsAll = allUsers.filter((user) => user.points > 0).sort(sortPoints).slice(0, 10).map(mapToStudent);
    const topStudentsPrimary = primaryUsers.filter((user) => user.points > 0).sort(sortPoints).slice(0, 10).map(mapToStudent);
    const topStudentsPrep = prepUsers.filter((user) => user.points > 0).sort(sortPoints).slice(0, 10).map(mapToStudent);
    const topStudentsSec = secUsers.filter((user) => user.points > 0).sort(sortPoints).slice(0, 10).map(mapToStudent);

    const topStreakersAdmin = allUsers.filter((user) => user.loginStreak > 0).sort(sortStreaks).slice(0, 10).map(mapToAdmin);
    const topStreakersAll = allUsers.filter((user) => user.loginStreak > 0).sort(sortStreaks).slice(0, 10).map(mapToStreakStudent);
    const topStreakersPrimary = primaryUsers.filter((user) => user.loginStreak > 0).sort(sortStreaks).slice(0, 10).map(mapToStreakStudent);
    const topStreakersPrep = prepUsers.filter((user) => user.loginStreak > 0).sort(sortStreaks).slice(0, 10).map(mapToStreakStudent);
    const topStreakersSec = secUsers.filter((user) => user.loginStreak > 0).sort(sortStreaks).slice(0, 10).map(mapToStreakStudent);

    const userRanks: Record<string, { pointsRank: number; streakRank: number }> = {};

    const sortedPointsAll = [...allUsers].sort(sortPoints);
    const sortedPointsPrimary = [...primaryUsers].sort(sortPoints);
    const sortedPointsPrep = [...prepUsers].sort(sortPoints);
    const sortedPointsSec = [...secUsers].sort(sortPoints);

    const sortedStreaksAll = [...allUsers].sort(sortStreaks);
    const sortedStreaksPrimary = [...primaryUsers].sort(sortStreaks);
    const sortedStreaksPrep = [...prepUsers].sort(sortStreaks);
    const sortedStreaksSec = [...secUsers].sort(sortStreaks);

    for (const user of allUsers) {
      let tierPointsList = sortedPointsAll;
      let tierStreaksList = sortedStreaksAll;

      const stage = user.educationalStage;
      if (stage) {
        if (stage.startsWith("primary")) {
          tierPointsList = sortedPointsPrimary;
          tierStreaksList = sortedStreaksPrimary;
        } else if (stage.startsWith("prep")) {
          tierPointsList = sortedPointsPrep;
          tierStreaksList = sortedStreaksPrep;
        } else if (stage.startsWith("sec")) {
          tierPointsList = sortedPointsSec;
          tierStreaksList = sortedStreaksSec;
        }
      }

      const pointsRank = tierPointsList.findIndex((entry) => entry.id === user.id) + 1;
      const streakRank = user.loginStreak > 0 ? tierStreaksList.filter((entry) => entry.loginStreak > user.loginStreak).length + 1 : 0;

      userRanks[user.id] = { pointsRank, streakRank };
    }

    const computedData = {
      topStudents: {
        admin: topStudentsAdmin,
        student_all: topStudentsAll,
        student_primary: topStudentsPrimary,
        student_prep: topStudentsPrep,
        student_sec: topStudentsSec,
      },
      topStreakers: {
        admin: topStreakersAdmin,
        student_all: topStreakersAll,
        student_primary: topStreakersPrimary,
        student_prep: topStreakersPrep,
        student_sec: topStreakersSec,
      },
      userRanks,
      updatedAt: new Date().toISOString(),
    };

    await prisma.leaderboardCache.upsert({
      where: { key: "leaderboard_data" },
      update: {
        data: JSON.stringify(computedData),
        updatedAt: new Date(),
      },
      create: {
        key: "leaderboard_data",
        data: JSON.stringify(computedData),
        updatedAt: new Date(),
      },
    });

    console.log(`[${new Date().toISOString()}] ✅ Leaderboard cache successfully updated.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to refresh leaderboard cache:`, error);
    throw error;
  } finally {
    if (!force) {
      await prisma.leaderboardCache.update({
        where: { key: lockKey },
        data: { updatedAt: new Date(0) },
      });
      console.log(`[${new Date().toISOString()}] 🔓 Lock released successfully.`);
    }
  }
}
