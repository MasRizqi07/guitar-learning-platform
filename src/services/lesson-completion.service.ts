import { prisma } from '@/lib/db';
import { AchievementService } from './achievement.service';
import { calculateStreak } from '@/domain/streak';
import { XP_VALUES } from '@/config/constants';
import { AppError } from '@/lib/errors';
import { LessonProgressStatus, XPTransactionType, ActivityType } from '@prisma/client';

export class LessonCompletionService {
  /**
   * Executes atomic, transactional lesson completion with all prerequisite checks and idempotency.
   */
  static async completeLesson(userId: string, lessonIdOrSlug: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch lesson with sections and quiz
      const lesson = await tx.lesson.findFirst({
        where: {
          OR: [{ id: lessonIdOrSlug }, { slug: lessonIdOrSlug }],
        },
        include: {
          sections: { orderBy: { order: 'asc' } },
          quiz: true,
          module: true,
        },
      });

      if (!lesson) {
        throw AppError.notFound('LESSON_NOT_FOUND', 'Lesson not found');
      }

      const lessonId = lesson.id;

      // 2. Fetch current user progress
      const progress = await tx.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
      });

      // If already completed, return existing completion state idempotently
      if (progress?.status === LessonProgressStatus.COMPLETED) {
        return {
          alreadyCompleted: true,
          lessonId,
          xpAwarded: 0,
          unlockedAchievements: [],
          message: 'Lesson is already completed.',
        };
      }

      // 3. Validate required sections traversed
      const requiredSections = lesson.sections.filter((s) => s.required);
      const currentOrder = progress?.currentSectionOrder ?? 1;
      if (currentOrder < requiredSections.length) {
        throw new AppError(
          'LESSON_REQUIREMENT_INCOMPLETE',
          `All required sections must be completed first (viewed ${currentOrder} of ${requiredSections.length})`,
          400
        );
      }

      // 4. Validate quiz completion if lesson has a quiz
      if (lesson.quiz) {
        const passingAttempt = await tx.quizAttempt.findFirst({
          where: {
            userId,
            quizId: lesson.quiz.id,
            passed: true,
          },
        });

        if (!passingAttempt) {
          throw new AppError(
            'LESSON_REQUIREMENT_INCOMPLETE',
            'You must pass the lesson quiz with at least 60% before completing this lesson.',
            400
          );
        }
      }

      // 5. Mark LessonProgress as COMPLETED
      await tx.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          status: LessonProgressStatus.COMPLETED,
          progressPercentage: 100,
          currentSectionOrder: requiredSections.length,
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        },
        create: {
          userId,
          lessonId,
          status: LessonProgressStatus.COMPLETED,
          progressPercentage: 100,
          currentSectionOrder: requiredSections.length,
          startedAt: new Date(),
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        },
      });

      // 6. Award Lesson Completed XP (+20 XP) idempotently
      const lessonXPKey = `lesson-completed:${userId}:${lessonId}`;
      let xpAwarded = 0;

      const existingXP = await tx.xPTransaction.findUnique({
        where: { idempotencyKey: lessonXPKey },
      });

      if (!existingXP) {
        xpAwarded = lesson.xpReward || XP_VALUES.LESSON_COMPLETE;
        await tx.xPTransaction.create({
          data: {
            userId,
            type: XPTransactionType.LESSON_COMPLETED,
            amount: xpAwarded,
            referenceType: 'LESSON',
            referenceId: lessonId,
            idempotencyKey: lessonXPKey,
          },
        });
      }

      // 7. Update user profile totals and streak
      const profile = await tx.profile.findUnique({ where: { userId } });
      if (!profile) {
        throw AppError.notFound('USER_NOT_FOUND', 'User profile not found');
      }

      const streakResult = calculateStreak(
        profile.currentStreak,
        profile.longestStreak,
        profile.lastActiveDate,
        profile.timezone
      );

      await tx.profile.update({
        where: { userId },
        data: {
          totalXP: { increment: xpAwarded },
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastActiveDate: new Date(),
        },
      });

      // 8. Log Learning Activity
      await tx.learningActivity.create({
        data: {
          userId,
          type: ActivityType.LESSON_COMPLETED,
          entityType: 'LESSON',
          entityId: lessonId,
          metadata: {
            lessonTitle: lesson.title,
            lessonOrder: lesson.order,
            moduleOrder: lesson.module.order,
            xpAwarded,
          },
        },
      });

      // 9. Evaluate Achievements
      const achievementResult = await AchievementService.evaluateAndUnlockAchievements(tx, userId);

      return {
        alreadyCompleted: false,
        lessonId,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        xpAwarded: xpAwarded + achievementResult.xpAwarded,
        currentStreak: streakResult.currentStreak,
        unlockedAchievements: achievementResult.unlocked,
        message: 'Lesson completed successfully! Next lesson unlocked.',
      };
    });
  }
}
