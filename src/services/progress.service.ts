import { prisma } from '@/lib/db';
import { calculateLevel } from '@/domain/level';
import { CurriculumService } from './curriculum.service';
import { AppError } from '@/lib/errors';

export class ProgressService {
  static async getProgressOverview(userId: string) {
    const [profile, learningPath, practiceAgg, quizAttempts, achievements, userAchievements, xpTransactions] =
      await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        CurriculumService.getLearningPath(userId),
        prisma.practiceSession.aggregate({
          where: { userId, isValid: true },
          _sum: { durationSeconds: true },
          _count: true,
        }),
        prisma.quizAttempt.findMany({
          where: { userId, completedAt: { not: null } },
          select: { score: true, passed: true },
        }),
        prisma.achievement.findMany({ where: { active: true } }),
        prisma.userAchievement.findMany({ where: { userId } }),
        prisma.xPTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    if (!profile) {
      throw AppError.notFound('USER_NOT_FOUND', 'User profile not found');
    }

    // 1. Level & XP
    const levelInfo = calculateLevel(profile.totalXP);

    // 2. Practice Stats
    const totalPracticeSeconds = practiceAgg._sum.durationSeconds || 0;
    const totalPracticeMinutes = Math.round(totalPracticeSeconds / 60);
    const validSessionsCount = practiceAgg._count || 0;

    // 3. Quiz Stats
    const totalQuizzesAttempted = quizAttempts.length;
    const quizzesPassed = quizAttempts.filter((q) => q.passed).length;
    const avgQuizScore =
      totalQuizzesAttempted > 0
        ? Math.round(
            quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / totalQuizzesAttempted
          )
        : 0;

    // 4. Achievements with unlock timestamps
    const unlockMap = new Map<string, Date>();
    for (const ua of userAchievements) {
      unlockMap.set(ua.achievementId, ua.unlockedAt);
    }

    const achievementsList = achievements.map((ach) => ({
      id: ach.id,
      code: ach.code,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      xpReward: ach.xpReward,
      isUnlocked: unlockMap.has(ach.id),
      unlockedAt: unlockMap.get(ach.id) || null,
    }));

    return {
      profile: {
        totalXP: profile.totalXP,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        level: levelInfo,
      },
      curriculum: {
        totalLessons: learningPath.course.totalLessons,
        completedLessons: learningPath.course.completedLessons,
        progressPercentage: learningPath.course.progressPercentage,
        modules: learningPath.modules.map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order,
          progressPercentage: m.progressPercentage,
        })),
      },
      practice: {
        totalMinutes: totalPracticeMinutes,
        sessionsCount: validSessionsCount,
      },
      quizzes: {
        attemptsCount: totalQuizzesAttempted,
        passedCount: quizzesPassed,
        averageScore: avgQuizScore,
      },
      achievements: achievementsList,
      xpLedger: xpTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        createdAt: tx.createdAt,
        referenceType: tx.referenceType,
      })),
    };
  }
}
