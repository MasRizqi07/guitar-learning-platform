import { prisma } from '@/lib/db';
import { PracticeRepository } from '@/repositories/practice.repository';
import { UserRepository } from '@/repositories/user.repository';
import { validatePracticeDuration } from '@/domain/practice-validator';
import { calculateStreak } from '@/domain/streak';
import { XP_VALUES } from '@/config/constants';
import { PracticeType, PracticeDifficulty, XPTransactionType, ActivityType } from '@prisma/client';
import { AppError } from '@/lib/errors';

export interface CompletePracticeInput {
  practiceType: PracticeType;
  durationSeconds: number;
  lessonId?: string | null;
  difficultyFeedback?: PracticeDifficulty | null;
  chordIds?: string[];
}

export class PracticeService {
  static async recordPracticeSession(userId: string, input: CompletePracticeInput) {
    const validation = validatePracticeDuration(input.practiceType, input.durationSeconds);

    // If invalid (too short)
    if (!validation.isValid) {
      const session = await PracticeRepository.createSession({
        userId,
        lessonId: input.lessonId,
        practiceType: input.practiceType,
        durationSeconds: input.durationSeconds,
        difficultyFeedback: input.difficultyFeedback,
        isValid: false,
        completedAt: new Date(),
        chordIds: input.chordIds,
      });

      return {
        session,
        isValid: false,
        xpAwarded: 0,
        dailyGoalCompleted: false,
        currentStreak: undefined,
        message: validation.message || 'Practice session was too short to count for XP or daily goals.',
      };
    }

    // Valid practice session transaction
    return prisma.$transaction(async (tx) => {
      // 1. Create valid practice session
      const session = await tx.practiceSession.create({
        data: {
          userId,
          lessonId: input.lessonId ?? null,
          practiceType: input.practiceType,
          durationSeconds: input.durationSeconds,
          difficultyFeedback: input.difficultyFeedback ?? null,
          isValid: true,
          completedAt: new Date(),
          sessionChords: input.chordIds?.length
            ? {
                create: input.chordIds.map((chordId) => ({ chordId })),
              }
            : undefined,
        },
      });

      // 2. Award Practice XP with idempotency key
      const idempotencyKey = `practice-completed:${session.id}`;
      let xpAwarded = 0;

      const existingXP = await tx.xPTransaction.findUnique({
        where: { idempotencyKey },
      });

      if (!existingXP) {
        xpAwarded = XP_VALUES.PRACTICE_COMPLETE;
        await tx.xPTransaction.create({
          data: {
            userId,
            type: XPTransactionType.PRACTICE_COMPLETED,
            amount: xpAwarded,
            referenceType: 'PRACTICE_SESSION',
            referenceId: session.id,
            idempotencyKey,
          },
        });
      }

      // 3. Update Streak & Profile
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

      // 4. Check Daily Practice Goal
      const onboarding = await tx.onboardingProfile.findUnique({ where: { userId } });
      const dailyGoalMinutes = onboarding?.dailyGoalMinutes ?? 15;

      // Calculate total today's practice minutes including this session
      const todayMinutes = await PracticeRepository.getTodayValidPracticeMinutes(userId, profile.timezone);
      let dailyGoalCompleted = false;

      if (todayMinutes >= dailyGoalMinutes) {
        const dailyGoalKey = `daily-goal:${userId}:${streakResult.lastActiveDate}`;
        const existingDailyGoalXP = await tx.xPTransaction.findUnique({
          where: { idempotencyKey: dailyGoalKey },
        });

        if (!existingDailyGoalXP) {
          dailyGoalCompleted = true;
          const dailyXP = XP_VALUES.DAILY_GOAL;
          xpAwarded += dailyXP;

          await tx.xPTransaction.create({
            data: {
              userId,
              type: XPTransactionType.DAILY_GOAL,
              amount: dailyXP,
              referenceType: 'DAILY_GOAL',
              referenceId: streakResult.lastActiveDate,
              idempotencyKey: dailyGoalKey,
            },
          });

          await tx.learningActivity.create({
            data: {
              userId,
              type: ActivityType.DAILY_GOAL_COMPLETED,
              entityType: 'DAILY_GOAL',
              entityId: streakResult.lastActiveDate,
              metadata: { minutesPracticed: todayMinutes, goalMinutes: dailyGoalMinutes },
            },
          });
        }
      }

      // Update Profile totalXP and streak
      await tx.profile.update({
        where: { userId },
        data: {
          totalXP: { increment: xpAwarded },
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          lastActiveDate: new Date(),
        },
      });

      // 5. Log Learning Activity
      await tx.learningActivity.create({
        data: {
          userId,
          type: ActivityType.PRACTICE_COMPLETED,
          entityType: 'PRACTICE_SESSION',
          entityId: session.id,
          metadata: {
            practiceType: input.practiceType,
            durationSeconds: input.durationSeconds,
            difficulty: input.difficultyFeedback,
          },
        },
      });

      return {
        session,
        isValid: true,
        xpAwarded,
        dailyGoalCompleted,
        currentStreak: streakResult.currentStreak,
        message: 'Practice completed successfully! Keep building those habits.',
      };
    });
  }

  static async getPracticeStats(userId: string) {
    const [profile, onboarding, sessions] = await Promise.all([
      UserRepository.getProfile(userId),
      UserRepository.getOnboarding(userId),
      PracticeRepository.getUserSessions(userId, 10),
    ]);

    const timezone = profile?.timezone || 'Asia/Jakarta';
    const todayMinutes = await PracticeRepository.getTodayValidPracticeMinutes(userId, timezone);
    const dailyGoalMinutes = onboarding?.dailyGoalMinutes || 15;

    return {
      todayMinutes,
      dailyGoalMinutes,
      goalProgressPercentage: Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100)),
      recentSessions: sessions,
    };
  }
}
