import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { UpdateProfileInput } from '@/validations/profile.schema';

export class ProfileService {
  static async getFullProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        onboardingProfile: true,
        userAchievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    // Aggregate lifetime statistics
    const [completedLessonsCount, practiceAgg, quizAttemptsCount, allAchievements] =
      await Promise.all([
        prisma.lessonProgress.count({
          where: { userId, status: 'COMPLETED' },
        }),
        prisma.practiceSession.aggregate({
          where: { userId, isValid: true },
          _sum: { durationSeconds: true },
          _count: { id: true },
        }),
        prisma.quizAttempt.count({
          where: { userId },
        }),
        prisma.achievement.findMany({
          orderBy: { xpReward: 'asc' },
        }),
      ]);

    const unlockedAchievementIds = new Set(
      user.userAchievements.map((ua) => ua.achievementId)
    );

    const achievementsWithStatus = allAchievements.map((ach) => {
      const userAch = user.userAchievements.find((ua) => ua.achievementId === ach.id);
      return {
        id: ach.id,
        code: ach.code,
        title: ach.name,
        description: ach.description,
        icon: ach.icon,
        xpReward: ach.xpReward,
        unlocked: unlockedAchievementIds.has(ach.id),
        unlockedAt: userAch?.unlockedAt ?? null,
      };
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      profile: user.profile,
      onboarding: user.onboardingProfile,
      stats: {
        completedLessonsCount,
        totalPracticeSeconds: practiceAgg._sum.durationSeconds || 0,
        totalPracticeSessions: practiceAgg._count.id || 0,
        quizAttemptsCount,
        unlockedAchievementsCount: unlockedAchievementIds.size,
        totalAchievementsCount: allAchievements.length,
      },
      achievements: achievementsWithStatus,
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    await prisma.$transaction(async (tx) => {
      if (input.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: input.name },
        });
      }

      if (input.timezone) {
        await tx.profile.upsert({
          where: { userId },
          update: { timezone: input.timezone },
          create: { userId, timezone: input.timezone },
        });
      }

      if (
        input.dailyGoalMinutes !== undefined ||
        input.guitarType !== undefined ||
        input.experienceLevel !== undefined
      ) {
        const updateData: Record<string, unknown> = {};
        if (input.dailyGoalMinutes !== undefined) {
          updateData.dailyGoalMinutes = input.dailyGoalMinutes;
        }
        if (input.guitarType !== undefined) {
          updateData.guitarType = input.guitarType;
        }
        if (input.experienceLevel !== undefined) {
          updateData.experienceLevel = input.experienceLevel;
        }

        await tx.onboardingProfile.updateMany({
          where: { userId },
          data: updateData,
        });
      }
    });

    return this.getFullProfile(userId);
  }
}
