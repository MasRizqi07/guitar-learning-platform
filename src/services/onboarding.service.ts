import { prisma } from '@/lib/db';
import { OnboardingInput } from '@/validations/onboarding';
import { RecommendedLevel, ActivityType } from '@prisma/client';

export class OnboardingService {
  static determinePlacement(experienceLevel: string, assessmentScore?: number): {
    recommendedLevel: RecommendedLevel;
    startingLessonOrder: number;
  } {
    if (experienceLevel === 'ABSOLUTE_BEGINNER') {
      return { recommendedLevel: RecommendedLevel.BEGINNER_1, startingLessonOrder: 1 };
    }

    const score = assessmentScore ?? 0;
    if (score >= 80) {
      return { recommendedLevel: RecommendedLevel.INTERMEDIATE_1, startingLessonOrder: 16 };
    }
    if (score >= 50) {
      return { recommendedLevel: RecommendedLevel.BEGINNER_3, startingLessonOrder: 11 };
    }
    if (score >= 25 || experienceLevel === 'BASIC_PLAYER') {
      return { recommendedLevel: RecommendedLevel.BEGINNER_2, startingLessonOrder: 6 };
    }

    return { recommendedLevel: RecommendedLevel.BEGINNER_1, startingLessonOrder: 1 };
  }

  static async completeOnboarding(userId: string, input: OnboardingInput) {
    const { recommendedLevel, startingLessonOrder } = this.determinePlacement(
      input.experienceLevel,
      input.assessmentScore
    );

    return prisma.$transaction(async (tx) => {
      // 1. Create or update OnboardingProfile
      const onboarding = await tx.onboardingProfile.upsert({
        where: { userId },
        update: {
          experienceLevel: input.experienceLevel,
          guitarType: input.guitarType,
          dailyGoalMinutes: input.dailyGoalMinutes,
          assessmentScore: input.assessmentScore ?? null,
          recommendedLevel,
          completed: true,
          completedAt: new Date(),
        },
        create: {
          userId,
          experienceLevel: input.experienceLevel,
          guitarType: input.guitarType,
          dailyGoalMinutes: input.dailyGoalMinutes,
          assessmentScore: input.assessmentScore ?? null,
          recommendedLevel,
          completed: true,
          completedAt: new Date(),
        },
      });

      // 2. Link Learning Goals
      if (input.learningGoalCodes.length > 0) {
        // Find existing goals
        const goals = await tx.learningGoal.findMany({
          where: { code: { in: input.learningGoalCodes } },
        });

        // Delete existing links if any
        await tx.userLearningGoal.deleteMany({
          where: { userId },
        });

        // Create new links
        for (const g of goals) {
          await tx.userLearningGoal.create({
            data: {
              userId,
              learningGoalId: g.id,
            },
          });
        }
      }

      // 3. Update Profile timezone
      if (input.timezone) {
        await tx.profile.update({
          where: { userId },
          data: { timezone: input.timezone },
        });
      }

      // 4. Log Learning Activity
      await tx.learningActivity.create({
        data: {
          userId,
          type: ActivityType.LESSON_STARTED,
          entityType: 'ONBOARDING',
          entityId: onboarding.id,
          metadata: {
            recommendedLevel,
            startingLessonOrder,
            experienceLevel: input.experienceLevel,
          },
        },
      });

      return {
        onboarding,
        recommendedLevel,
        startingLessonOrder,
      };
    });
  }

  static async getOnboardingStatus(userId: string) {
    const onboarding = await prisma.onboardingProfile.findUnique({
      where: { userId },
    });

    const goals = await prisma.userLearningGoal.findMany({
      where: { userId },
      include: { learningGoal: true },
    });

    return {
      completed: Boolean(onboarding?.completed),
      onboarding,
      goals: goals.map((g) => g.learningGoal),
    };
  }
}
