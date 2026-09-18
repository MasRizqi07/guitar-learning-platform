import { Prisma, ActivityType, XPTransactionType } from '@prisma/client';

export class AchievementService {
  /**
   * Evaluates all active achievements within the active Prisma transaction and awards unlocks idempotently.
   */
  static async evaluateAndUnlockAchievements(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<{ unlocked: string[]; xpAwarded: number }> {
    const achievements = await tx.achievement.findMany({ where: { active: true } });
    const userAchievements = await tx.userAchievement.findMany({ where: { userId } });
    const unlockedSet = new Set(userAchievements.map((ua) => ua.achievementId));

    // Fetch user progress metrics
    const [completedLessonsCount, profile, practiceSessions] = await Promise.all([
      tx.lessonProgress.count({
        where: { userId, status: 'COMPLETED' },
      }),
      tx.profile.findUnique({ where: { userId } }),
      tx.practiceSession.aggregate({
        where: { userId, isValid: true },
        _sum: { durationSeconds: true },
      }),
    ]);

    const totalPracticeSeconds = practiceSessions._sum.durationSeconds || 0;
    const currentStreak = profile?.currentStreak || 0;

    const unlockedCodes: string[] = [];
    let totalXpAwarded = 0;

    for (const ach of achievements) {
      if (unlockedSet.has(ach.id)) continue; // Already unlocked

      let isSatisfied = false;

      switch (ach.code) {
        case 'FIRST_STEP':
          isSatisfied = completedLessonsCount >= 1;
          break;
        case 'FIRST_CHORD':
          // Completed at least one chord lesson (Module 2 lessons: order 6 to 10)
          const chordLessonsCompleted = await tx.lessonProgress.count({
            where: {
              userId,
              status: 'COMPLETED',
              lesson: { module: { order: 2 } },
            },
          });
          isSatisfied = chordLessonsCompleted >= 1;
          break;
        case 'DEDICATED_LEARNER':
          isSatisfied = completedLessonsCount >= 10;
          break;
        case 'CONSISTENT_LEARNER':
          isSatisfied = currentStreak >= 7;
          break;
        case 'PRACTICE_STARTER':
          isSatisfied = totalPracticeSeconds >= 3600;
          break;
        default:
          break;
      }

      if (isSatisfied) {
        // Unlock achievement
        await tx.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
            unlockedAt: new Date(),
          },
        });

        // Award achievement XP idempotently
        const achKey = `achievement:${userId}:${ach.id}`;
        const existingXP = await tx.xPTransaction.findUnique({
          where: { idempotencyKey: achKey },
        });

        if (!existingXP) {
          totalXpAwarded += ach.xpReward;
          await tx.xPTransaction.create({
            data: {
              userId,
              type: XPTransactionType.ACHIEVEMENT,
              amount: ach.xpReward,
              referenceType: 'ACHIEVEMENT',
              referenceId: ach.id,
              idempotencyKey: achKey,
            },
          });
        }

        // Log Learning Activity
        await tx.learningActivity.create({
          data: {
            userId,
            type: ActivityType.ACHIEVEMENT_UNLOCKED,
            entityType: 'ACHIEVEMENT',
            entityId: ach.id,
            metadata: { code: ach.code, name: ach.name },
          },
        });

        unlockedCodes.push(ach.name);
      }
    }

    if (totalXpAwarded > 0) {
      await tx.profile.update({
        where: { userId },
        data: { totalXP: { increment: totalXpAwarded } },
      });
    }

    return { unlocked: unlockedCodes, xpAwarded: totalXpAwarded };
  }
}
