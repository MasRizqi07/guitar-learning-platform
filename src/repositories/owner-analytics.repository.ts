import { prisma } from '@/lib/db';
import { LessonProgressStatus, PracticeDifficulty, ContentStatus, UserRole } from '@prisma/client';

export const LEARNER_ANALYTICS_USER_FILTER = {
  role: { notIn: ['CONTENT_EDITOR', 'SUPPORT', 'ADMIN', 'OWNER'] as UserRole[] },
  analyticsExcluded: false,
  status: { not: 'DELETED' as const },
};

export interface FunnelStageData {
  stage: string;
  count: number;
  stepConversionRate: number; // percentage (0 - 100)
  overallConversionRate: number; // percentage (0 - 100)
}

export interface RetentionCohortRow {
  cohortDate: string; // YYYY-MM-DD
  cohortSize: number;
  d1: { eligible: boolean; retainedCount: number; rate: number };
  d7: { eligible: boolean; retainedCount: number; rate: number };
  d30: { eligible: boolean; retainedCount: number; rate: number };
}

export interface LessonContentPerformanceRow {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  courseTitle: string;
  order: number;
  status: ContentStatus;
  starts: number;
  completions: number;
  completionRate: number; // percentage (0 - 100)
  stalledLearners: number;
  practiceDifficulty: {
    easy: number;
    okay: number;
    difficult: number;
  };
  quizAttempts: number;
  quizPassRate: number; // percentage (0 - 100)
}

export class OwnerAnalyticsRepository {
  /**
   * Total eligible learners registered all-time
   */
  static async getTotalLearners(): Promise<number> {
    return prisma.user.count({
      where: LEARNER_ANALYTICS_USER_FILTER,
    });
  }

  /**
   * Total eligible learners with verified email all-time
   */
  static async getVerifiedLearnersCount(): Promise<number> {
    return prisma.user.count({
      where: {
        ...LEARNER_ANALYTICS_USER_FILTER,
        emailVerified: { not: null },
      },
    });
  }

  /**
   * New eligible learners registered within window
   */
  static async getNewLearnersCount(startDate: Date, endDate: Date): Promise<number> {
    return prisma.user.count({
      where: {
        ...LEARNER_ANALYTICS_USER_FILTER,
        createdAt: { gte: startDate, lte: endDate },
      },
    });
  }

  /**
   * Distinct eligible learner IDs who executed meaningful activity in window
   */
  static async getMeaningfulActiveUserIds(startDate: Date, endDate: Date): Promise<Set<string>> {
    const [progressUsers, practiceUsers, quizUsers] = await Promise.all([
      // 1. Lesson Progress interaction
      prisma.lessonProgress.findMany({
        where: {
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: [LessonProgressStatus.IN_PROGRESS, LessonProgressStatus.COMPLETED] },
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // 2. Valid practice sessions
      prisma.practiceSession.findMany({
        where: {
          completedAt: { gte: startDate, lte: endDate },
          isValid: true,
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // 3. Completed quiz attempts
      prisma.quizAttempt.findMany({
        where: {
          completedAt: { gte: startDate, lte: endDate },
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const activeSet = new Set<string>();
    progressUsers.forEach((p) => activeSet.add(p.userId));
    practiceUsers.forEach((p) => activeSet.add(p.userId));
    quizUsers.forEach((q) => activeSet.add(q.userId));

    return activeSet;
  }

  /**
   * Onboarding completion stats for all eligible learners
   */
  static async getOnboardingStats(): Promise<{ completed: number; total: number; rate: number }> {
    const total = await this.getTotalLearners();
    if (total === 0) {
      return { completed: 0, total: 0, rate: 0 };
    }

    const completed = await prisma.onboardingProfile.count({
      where: {
        completed: true,
        user: LEARNER_ANALYTICS_USER_FILTER,
      },
    });

    const rate = Math.round((completed / total) * 1000) / 10;
    return { completed, total, rate };
  }

  /**
   * Activation: First lesson started rate for cohort registered in window
   */
  static async getFirstLessonActivationRate(
    startDate: Date,
    endDate: Date
  ): Promise<{ activatedCount: number; cohortSize: number; rate: number }> {
    const cohortUsers = await prisma.user.findMany({
      where: {
        ...LEARNER_ANALYTICS_USER_FILTER,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        lessonProgress: {
          where: { startedAt: { not: null } },
          select: { id: true },
          take: 1,
        },
      },
    });

    const cohortSize = cohortUsers.length;
    if (cohortSize === 0) {
      return { activatedCount: 0, cohortSize: 0, rate: 0 };
    }

    const activatedCount = cohortUsers.filter((u) => u.lessonProgress.length > 0).length;
    const rate = Math.round((activatedCount / cohortSize) * 1000) / 10;
    return { activatedCount, cohortSize, rate };
  }

  /**
   * Course completion count (learners who finished all published lessons of a course)
   */
  static async getCourseCompletionCount(): Promise<number> {
    const publishedCourses = await prisma.course.findMany({
      where: { status: ContentStatus.PUBLISHED },
      include: {
        modules: {
          where: { status: ContentStatus.PUBLISHED },
          include: {
            lessons: {
              where: { status: ContentStatus.PUBLISHED },
              select: { id: true },
            },
          },
        },
      },
    });

    if (publishedCourses.length === 0) return 0;

    let totalLearnersWithAnyCourseCompleted = 0;
    const eligibleLearners = await prisma.user.findMany({
      where: LEARNER_ANALYTICS_USER_FILTER,
      select: {
        id: true,
        lessonProgress: {
          where: { status: LessonProgressStatus.COMPLETED },
          select: { lessonId: true },
        },
      },
    });

    for (const learner of eligibleLearners) {
      const completedLessonIds = new Set(learner.lessonProgress.map((p) => p.lessonId));

      let hasCompletedAnyCourse = false;
      for (const course of publishedCourses) {
        const courseLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
        if (courseLessonIds.length > 0 && courseLessonIds.every((lid) => completedLessonIds.has(lid))) {
          hasCompletedAnyCourse = true;
          break;
        }
      }

      if (hasCompletedAnyCourse) {
        totalLearnersWithAnyCourseCompleted++;
      }
    }

    return totalLearnersWithAnyCourseCompleted;
  }

  /**
   * Practice stats for valid sessions within window
   */
  static async getPracticeStats(startDate: Date, endDate: Date) {
    const validSessions = await prisma.practiceSession.findMany({
      where: {
        completedAt: { gte: startDate, lte: endDate },
        isValid: true,
        user: LEARNER_ANALYTICS_USER_FILTER,
      },
      select: {
        durationSeconds: true,
        practiceType: true,
        difficultyFeedback: true,
      },
    });

    const totalSeconds = validSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const sessionCount = validSessions.length;
    const averageSessionDuration = sessionCount > 0 ? Math.round(totalSeconds / sessionCount) : 0;

    const typeDistribution: Record<string, { count: number; totalMinutes: number }> = {
      DAILY: { count: 0, totalMinutes: 0 },
      CHORD: { count: 0, totalMinutes: 0 },
      CHORD_TRANSITION: { count: 0, totalMinutes: 0 },
      STRUMMING: { count: 0, totalMinutes: 0 },
      LESSON: { count: 0, totalMinutes: 0 },
    };

    const difficultyDistribution: Record<string, number> = {
      EASY: 0,
      OKAY: 0,
      DIFFICULT: 0,
      UNRATED: 0,
    };

    for (const s of validSessions) {
      const t = s.practiceType || 'DAILY';
      if (!typeDistribution[t]) {
        typeDistribution[t] = { count: 0, totalMinutes: 0 };
      }
      typeDistribution[t].count++;
      typeDistribution[t].totalMinutes += Math.round(s.durationSeconds / 60);

      if (s.difficultyFeedback) {
        difficultyDistribution[s.difficultyFeedback] = (difficultyDistribution[s.difficultyFeedback] || 0) + 1;
      } else {
        difficultyDistribution.UNRATED++;
      }
    }

    return {
      totalMinutes,
      sessionCount,
      averageSessionDuration, // in seconds
      typeDistribution,
      difficultyDistribution,
    };
  }

  /**
   * Quiz performance stats for completed attempts within window
   */
  static async getQuizStats(startDate: Date, endDate: Date) {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        completedAt: { gte: startDate, lte: endDate },
        user: LEARNER_ANALYTICS_USER_FILTER,
      },
      select: {
        id: true,
        userId: true,
        score: true,
        passed: true,
      },
    });

    const totalAttempts = attempts.length;
    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        passedAttempts: 0,
        passRate: 0,
        averageScore: 0,
        uniqueLearners: 0,
        averageAttemptsPerLearner: 0,
      };
    }

    const passedAttempts = attempts.filter((a) => a.passed).length;
    const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
    const passRate = Math.round((passedAttempts / totalAttempts) * 1000) / 10;
    const averageScore = Math.round((totalScore / totalAttempts) * 10) / 10;

    const uniqueLearners = new Set(attempts.map((a) => a.userId)).size;
    const averageAttemptsPerLearner =
      uniqueLearners > 0 ? Math.round((totalAttempts / uniqueLearners) * 10) / 10 : 0;

    return {
      totalAttempts,
      passedAttempts,
      passRate,
      averageScore,
      uniqueLearners,
      averageAttemptsPerLearner,
    };
  }

  /**
   * Achievements unlocked in window
   */
  static async getAchievementsUnlockedCount(startDate: Date, endDate: Date): Promise<number> {
    return prisma.userAchievement.count({
      where: {
        unlockedAt: { gte: startDate, lte: endDate },
        user: LEARNER_ANALYTICS_USER_FILTER,
      },
    });
  }

  /**
   * Active streak distribution among eligible learners
   */
  static async getStreakDistribution() {
    const profiles = await prisma.profile.findMany({
      where: {
        user: LEARNER_ANALYTICS_USER_FILTER,
      },
      select: { currentStreak: true },
    });

    const buckets: Record<string, number> = {
      '0': 0,
      '1-3': 0,
      '4-7': 0,
      '8-14': 0,
      '15-30': 0,
      '30+': 0,
    };

    for (const p of profiles) {
      const s = p.currentStreak;
      if (s === 0) buckets['0']++;
      else if (s <= 3) buckets['1-3']++;
      else if (s <= 7) buckets['4-7']++;
      else if (s <= 14) buckets['8-14']++;
      else if (s <= 30) buckets['15-30']++;
      else buckets['30+']++;
    }

    return buckets;
  }

  /**
   * Lessons started and completed counts in window
   */
  static async getLessonProgressStats(startDate: Date, endDate: Date) {
    const [started, completed] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: {
          startedAt: { gte: startDate, lte: endDate },
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true },
      }),
      prisma.lessonProgress.findMany({
        where: {
          completedAt: { gte: startDate, lte: endDate },
          status: LessonProgressStatus.COMPLETED,
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true },
      }),
    ]);

    const uniqueStartedLearners = new Set(started.map((s) => s.userId)).size;
    const uniqueCompletedLearners = new Set(completed.map((c) => c.userId)).size;

    const completionRate =
      uniqueStartedLearners > 0
        ? Math.round((uniqueCompletedLearners / uniqueStartedLearners) * 1000) / 10
        : 0;

    return {
      lessonsStarted: started.length,
      lessonsCompleted: completed.length,
      uniqueStartedLearners,
      uniqueCompletedLearners,
      completionRate,
    };
  }

  /**
   * User Growth Timeseries (day by day)
   */
  static async getGrowthTimeseries(
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      date: string; // YYYY-MM-DD
      newRegistrations: number;
      verifiedRegistrations: number;
      activeLearners: number;
    }>
  > {
    const users = await prisma.user.findMany({
      where: {
        ...LEARNER_ANALYTICS_USER_FILTER,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    // Bucket by day in UTC
    const dayMap = new Map<
      string,
      { newRegistrations: number; verifiedRegistrations: number; activeUserIds: Set<string> }
    >();

    // Initialize all dates in range
    const cur = new Date(startDate.getTime());
    while (cur <= endDate) {
      const dStr = cur.toISOString().split('T')[0];
      if (!dayMap.has(dStr)) {
        dayMap.set(dStr, { newRegistrations: 0, verifiedRegistrations: 0, activeUserIds: new Set() });
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    for (const u of users) {
      const dStr = u.createdAt.toISOString().split('T')[0];
      const entry = dayMap.get(dStr);
      if (entry) {
        entry.newRegistrations++;
        if (u.emailVerified) {
          entry.verifiedRegistrations++;
        }
      }
    }

    // Populate active learners per day in window
    const [progressEvents, practiceEvents, quizEvents] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: {
          updatedAt: { gte: startDate, lte: endDate },
          status: { in: [LessonProgressStatus.IN_PROGRESS, LessonProgressStatus.COMPLETED] },
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true, updatedAt: true },
      }),
      prisma.practiceSession.findMany({
        where: {
          completedAt: { gte: startDate, lte: endDate },
          isValid: true,
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true, completedAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: {
          completedAt: { gte: startDate, lte: endDate },
          user: LEARNER_ANALYTICS_USER_FILTER,
        },
        select: { userId: true, completedAt: true },
      }),
    ]);

    for (const p of progressEvents) {
      const dStr = p.updatedAt.toISOString().split('T')[0];
      dayMap.get(dStr)?.activeUserIds.add(p.userId);
    }
    for (const pr of practiceEvents) {
      if (pr.completedAt) {
        const dStr = pr.completedAt.toISOString().split('T')[0];
        dayMap.get(dStr)?.activeUserIds.add(pr.userId);
      }
    }
    for (const q of quizEvents) {
      if (q.completedAt) {
        const dStr = q.completedAt.toISOString().split('T')[0];
        dayMap.get(dStr)?.activeUserIds.add(q.userId);
      }
    }

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        newRegistrations: data.newRegistrations,
        verifiedRegistrations: data.verifiedRegistrations,
        activeLearners: data.activeUserIds.size,
      }));
  }

  /**
   * Activation Funnel (Cohort-based on learners registered in window)
   */
  static async getActivationFunnel(startDate: Date, endDate: Date): Promise<FunnelStageData[]> {
    const cohortUsers = await prisma.user.findMany({
      where: {
        ...LEARNER_ANALYTICS_USER_FILTER,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        createdAt: true,
        emailVerified: true,
        onboardingProfile: {
          select: { completed: true },
        },
        lessonProgress: {
          select: {
            startedAt: true,
            status: true,
            updatedAt: true,
          },
        },
        practiceSessions: {
          where: { isValid: true },
          select: { completedAt: true },
        },
        quizAttempts: {
          where: { completedAt: { not: null } },
          select: { completedAt: true },
        },
      },
    });

    const total = cohortUsers.length;
    if (total === 0) {
      return [
        { stage: 'Registered', count: 0, stepConversionRate: 100, overallConversionRate: 100 },
        { stage: 'Email Verified', count: 0, stepConversionRate: 0, overallConversionRate: 0 },
        { stage: 'Onboarding Completed', count: 0, stepConversionRate: 0, overallConversionRate: 0 },
        { stage: 'First Lesson Started', count: 0, stepConversionRate: 0, overallConversionRate: 0 },
        { stage: 'First Lesson Completed', count: 0, stepConversionRate: 0, overallConversionRate: 0 },
        { stage: 'Returned Later', count: 0, stepConversionRate: 0, overallConversionRate: 0 },
      ];
    }

    const n1 = total;
    const n2 = cohortUsers.filter((u) => u.emailVerified !== null).length;
    const n3 = cohortUsers.filter((u) => u.emailVerified !== null && u.onboardingProfile?.completed).length;
    const n4 = cohortUsers.filter(
      (u) =>
        u.emailVerified !== null &&
        u.onboardingProfile?.completed &&
        u.lessonProgress.some((lp) => lp.startedAt !== null)
    ).length;
    const n5 = cohortUsers.filter(
      (u) =>
        u.emailVerified !== null &&
        u.onboardingProfile?.completed &&
        u.lessonProgress.some((lp) => lp.status === LessonProgressStatus.COMPLETED)
    ).length;

    // Returned Later: qualifying activity >= 24 hours after registration
    const n6 = cohortUsers.filter((u) => {
      const regTime = u.createdAt.getTime();
      const cutoff = regTime + 24 * 60 * 60 * 1000;

      const hasLaterProgress = u.lessonProgress.some((lp) => lp.updatedAt.getTime() >= cutoff);
      const hasLaterPractice = u.practiceSessions.some(
        (ps) => ps.completedAt && ps.completedAt.getTime() >= cutoff
      );
      const hasLaterQuiz = u.quizAttempts.some(
        (qa) => qa.completedAt && qa.completedAt.getTime() >= cutoff
      );

      return (
        u.emailVerified !== null &&
        u.onboardingProfile?.completed &&
        (hasLaterProgress || hasLaterPractice || hasLaterQuiz)
      );
    }).length;

    const counts = [n1, n2, n3, n4, n5, n6];
    const stages = [
      'Registered',
      'Email Verified',
      'Onboarding Completed',
      'First Lesson Started',
      'First Lesson Completed',
      'Returned Later',
    ];

    return stages.map((stage, idx) => {
      const count = counts[idx];
      const prevCount = idx === 0 ? count : counts[idx - 1];
      const stepConversionRate = prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0;
      const overallConversionRate = n1 > 0 ? Math.round((count / n1) * 1000) / 10 : 0;

      return {
        stage,
        count,
        stepConversionRate,
        overallConversionRate,
      };
    });
  }

  /**
   * Retention Cohorts with maturity rules (D1, D7, D30)
   */
  static async getRetentionCohorts(
    startDate: Date,
    endDate: Date,
    referenceDate: Date = new Date()
  ): Promise<{
    cohorts: RetentionCohortRow[];
    matureAverages: { d1: number; d7: number; d30: number };
  }> {
    const cohortUsers = await prisma.user.findMany({
      where: {
        ...LEARNER_ANALYTICS_USER_FILTER,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        createdAt: true,
        lessonProgress: {
          select: { updatedAt: true },
        },
        practiceSessions: {
          where: { isValid: true },
          select: { completedAt: true },
        },
        quizAttempts: {
          where: { completedAt: { not: null } },
          select: { completedAt: true },
        },
      },
    });

    // Group users by cohort registration date (YYYY-MM-DD)
    const cohortMap = new Map<string, typeof cohortUsers>();

    for (const u of cohortUsers) {
      const dStr = u.createdAt.toISOString().split('T')[0];
      if (!cohortMap.has(dStr)) {
        cohortMap.set(dStr, []);
      }
      cohortMap.get(dStr)!.push(u);
    }

    const sortedDates = Array.from(cohortMap.keys()).sort();
    const rows: RetentionCohortRow[] = [];

    let d1MatureSum = 0;
    let d1MatureDenom = 0;
    let d7MatureSum = 0;
    let d7MatureDenom = 0;
    let d30MatureSum = 0;
    let d30MatureDenom = 0;

    const refTime = referenceDate.getTime();

    for (const dateStr of sortedDates) {
      const usersInCohort = cohortMap.get(dateStr)!;
      const cohortSize = usersInCohort.length;

      // Cohort Day 0 start timestamp (00:00:00 UTC)
      const cohortDayStart = new Date(`${dateStr}T00:00:00.000Z`).getTime();
      const cohortAgeDays = Math.floor((refTime - cohortDayStart) / (24 * 60 * 60 * 1000));

      const isD1Eligible = cohortAgeDays >= 1;
      const isD7Eligible = cohortAgeDays >= 7;
      const isD30Eligible = cohortAgeDays >= 30;

      let d1Retained = 0;
      let d7Retained = 0;
      let d30Retained = 0;

      for (const u of usersInCohort) {
        // Collect all activity timestamps for user
        const timestamps: number[] = [
          ...u.lessonProgress.map((lp) => lp.updatedAt.getTime()),
          ...u.practiceSessions
            .filter((ps) => ps.completedAt !== null)
            .map((ps) => ps.completedAt!.getTime()),
          ...u.quizAttempts
            .filter((qa) => qa.completedAt !== null)
            .map((qa) => qa.completedAt!.getTime()),
        ];

        // Day 1 exact day: [DayStart + 24h, DayStart + 48h)
        if (isD1Eligible) {
          const d1Start = cohortDayStart + 24 * 60 * 60 * 1000;
          const d1End = cohortDayStart + 48 * 60 * 60 * 1000;
          if (timestamps.some((t) => t >= d1Start && t < d1End)) {
            d1Retained++;
          }
        }

        // Day 7 exact day: [DayStart + 7*24h, DayStart + 8*24h)
        if (isD7Eligible) {
          const d7Start = cohortDayStart + 7 * 24 * 60 * 60 * 1000;
          const d7End = cohortDayStart + 8 * 24 * 60 * 60 * 1000;
          if (timestamps.some((t) => t >= d7Start && t < d7End)) {
            d7Retained++;
          }
        }

        // Day 30 exact day: [DayStart + 30*24h, DayStart + 31*24h)
        if (isD30Eligible) {
          const d30Start = cohortDayStart + 30 * 24 * 60 * 60 * 1000;
          const d30End = cohortDayStart + 31 * 24 * 60 * 60 * 1000;
          if (timestamps.some((t) => t >= d30Start && t < d30End)) {
            d30Retained++;
          }
        }
      }

      const d1Rate =
        isD1Eligible && cohortSize > 0 ? Math.round((d1Retained / cohortSize) * 1000) / 10 : 0;
      const d7Rate =
        isD7Eligible && cohortSize > 0 ? Math.round((d7Retained / cohortSize) * 1000) / 10 : 0;
      const d30Rate =
        isD30Eligible && cohortSize > 0 ? Math.round((d30Retained / cohortSize) * 1000) / 10 : 0;

      if (isD1Eligible && cohortSize > 0) {
        d1MatureSum += d1Retained;
        d1MatureDenom += cohortSize;
      }
      if (isD7Eligible && cohortSize > 0) {
        d7MatureSum += d7Retained;
        d7MatureDenom += cohortSize;
      }
      if (isD30Eligible && cohortSize > 0) {
        d30MatureSum += d30Retained;
        d30MatureDenom += cohortSize;
      }

      rows.push({
        cohortDate: dateStr,
        cohortSize,
        d1: { eligible: isD1Eligible, retainedCount: d1Retained, rate: d1Rate },
        d7: { eligible: isD7Eligible, retainedCount: d7Retained, rate: d7Rate },
        d30: { eligible: isD30Eligible, retainedCount: d30Retained, rate: d30Rate },
      });
    }

    return {
      cohorts: rows,
      matureAverages: {
        d1: d1MatureDenom > 0 ? Math.round((d1MatureSum / d1MatureDenom) * 1000) / 10 : 0,
        d7: d7MatureDenom > 0 ? Math.round((d7MatureSum / d7MatureDenom) * 1000) / 10 : 0,
        d30: d30MatureDenom > 0 ? Math.round((d30MatureSum / d30MatureDenom) * 1000) / 10 : 0,
      },
    };
  }

  /**
   * Content / Lesson Performance
   */
  static async getContentPerformance(limit = 100): Promise<LessonContentPerformanceRow[]> {
    const lessons = await prisma.lesson.findMany({
      take: limit,
      orderBy: [{ module: { course: { order: 'asc' } } }, { module: { order: 'asc' } }, { order: 'asc' }],
      include: {
        module: {
          include: {
            course: true,
          },
        },
        quiz: {
          include: {
            attempts: {
              where: {
                completedAt: { not: null },
                user: LEARNER_ANALYTICS_USER_FILTER,
              },
              select: { passed: true },
            },
          },
        },
        lessonProgress: {
          where: {
            user: LEARNER_ANALYTICS_USER_FILTER,
          },
          select: {
            userId: true,
            status: true,
            startedAt: true,
            lastAccessedAt: true,
          },
        },
        practiceSessions: {
          where: {
            isValid: true,
            user: LEARNER_ANALYTICS_USER_FILTER,
          },
          select: {
            difficultyFeedback: true,
          },
        },
      },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return lessons.map((l) => {
      // Starts: distinct learners with startedAt IS NOT NULL
      const startedProgress = l.lessonProgress.filter((lp) => lp.startedAt !== null);
      const uniqueStarts = new Set(startedProgress.map((p) => p.userId)).size;

      // Completions: distinct learners with status COMPLETED
      const completedProgress = l.lessonProgress.filter((lp) => lp.status === LessonProgressStatus.COMPLETED);
      const uniqueCompletions = new Set(completedProgress.map((p) => p.userId)).size;

      const completionRate =
        uniqueStarts > 0 ? Math.round((uniqueCompletions / uniqueStarts) * 1000) / 10 : 0;

      // Stalled: started, NOT completed, lastAccessedAt < 7 days ago
      const stalledLearners = new Set(
        l.lessonProgress
          .filter(
            (lp) =>
              lp.startedAt !== null &&
              lp.status !== LessonProgressStatus.COMPLETED &&
              lp.lastAccessedAt < sevenDaysAgo
          )
          .map((lp) => lp.userId)
      ).size;

      // Practice difficulty
      const practiceDifficulty = { easy: 0, okay: 0, difficult: 0 };
      for (const ps of l.practiceSessions) {
        if (ps.difficultyFeedback === PracticeDifficulty.EASY) practiceDifficulty.easy++;
        else if (ps.difficultyFeedback === PracticeDifficulty.OKAY) practiceDifficulty.okay++;
        else if (ps.difficultyFeedback === PracticeDifficulty.DIFFICULT) practiceDifficulty.difficult++;
      }

      // Quiz pass rate
      let quizAttempts = 0;
      let quizPassRate = 0;
      if (l.quiz && l.quiz.attempts.length > 0) {
        quizAttempts = l.quiz.attempts.length;
        const passedCount = l.quiz.attempts.filter((a) => a.passed).length;
        quizPassRate = Math.round((passedCount / quizAttempts) * 1000) / 10;
      }

      return {
        lessonId: l.id,
        lessonTitle: l.title,
        moduleTitle: l.module.title,
        courseTitle: l.module.course.title,
        order: l.order,
        status: l.status,
        starts: uniqueStarts,
        completions: uniqueCompletions,
        completionRate,
        stalledLearners,
        practiceDifficulty,
        quizAttempts,
        quizPassRate,
      };
    });
  }
}
