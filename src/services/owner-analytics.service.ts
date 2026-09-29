import { prisma } from '@/lib/db';
import {
  OwnerAnalyticsRepository,
} from '@/repositories/owner-analytics.repository';
import { AnalyticsQueryInput } from '@/validations/owner';
import { AppError } from '@/lib/errors';
import { AdminAuditService, OWNER_AUDIT_ACTIONS } from '@/services/admin-audit.service';

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

export class OwnerAnalyticsService {
  private static cache = new Map<string, CachedEntry<unknown>>();
  private static CACHE_TTL_MS = 60 * 1000; // 60 seconds

  /**
   * Helper to resolve & validate date ranges safely
   */
  static resolveDateRange(query?: AnalyticsQueryInput): { startDate: Date; endDate: Date; range: string } {
    const range = query?.range || '30d';
    const now = new Date();

    if (range === 'custom') {
      if (!query?.startDate || !query?.endDate) {
        throw AppError.invalidAnalyticsRange('Custom date range requires both startDate and endDate');
      }

      const start = new Date(query.startDate);
      const end = new Date(query.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw AppError.invalidAnalyticsRange('Invalid date format for custom range');
      }

      if (start > end) {
        throw AppError.invalidAnalyticsRange('Start date cannot be after end date');
      }

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        throw AppError.invalidAnalyticsRange('Analytics date range cannot exceed 365 days');
      }

      return { startDate: start, endDate: end, range };
    }

    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '90d') days = 90;

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now, range };
  }

  /**
   * Memory caching helper
   */
  private static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key) as CachedEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  }

  private static setInCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  static invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Overview KPI Cards for /owner dashboard
   */
  static async getOverview(query?: AnalyticsQueryInput) {
    const { startDate, endDate, range } = this.resolveDateRange(query);
    const cacheKey = `overview:${range}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.getFromCache<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLearners,
      verifiedLearners,
      newLearners,
      windowActiveIds,
      dauSet,
      wauSet,
      mauSet,
      onboardingStats,
      activation,
      practiceStats,
      quizStats,
      courseCompletions,
    ] = await Promise.all([
      OwnerAnalyticsRepository.getTotalLearners(),
      OwnerAnalyticsRepository.getVerifiedLearnersCount(),
      OwnerAnalyticsRepository.getNewLearnersCount(startDate, endDate),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(startDate, endDate),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(oneDayAgo, now),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(sevenDaysAgo, now),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(thirtyDaysAgo, now),
      OwnerAnalyticsRepository.getOnboardingStats(),
      OwnerAnalyticsRepository.getFirstLessonActivationRate(startDate, endDate),
      OwnerAnalyticsRepository.getPracticeStats(startDate, endDate),
      OwnerAnalyticsRepository.getQuizStats(startDate, endDate),
      OwnerAnalyticsRepository.getCourseCompletionCount(),
    ]);

    const dau = dauSet.size;
    const wau = wauSet.size;
    const mau = mauSet.size;
    const stickiness = mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0;
    const verifiedRate = totalLearners > 0 ? Math.round((verifiedLearners / totalLearners) * 1000) / 10 : 0;

    const result = {
      window: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      learners: {
        total: totalLearners,
        verified: verifiedLearners,
        verifiedRate,
        new: newLearners,
        activeInWindow: windowActiveIds.size,
      },
      engagement: {
        dau,
        wau,
        mau,
        stickiness, // percentage
      },
      activation: {
        onboardingCompleted: onboardingStats.completed,
        onboardingRate: onboardingStats.rate,
        firstLessonStarted: activation.activatedCount,
        firstLessonActivationRate: activation.rate,
      },
      learning: {
        validPracticeMinutes: practiceStats.totalMinutes,
        validPracticeSessions: practiceStats.sessionCount,
        quizPassRate: quizStats.passRate,
        courseCompletions,
      },
    };

    this.setInCache(cacheKey, result);
    return result;
  }

  /**
   * User Growth, Funnel, and Retention Cohorts
   */
  static async getUserAnalytics(query?: AnalyticsQueryInput) {
    const { startDate, endDate, range } = this.resolveDateRange(query);
    const cacheKey = `users:${range}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.getFromCache<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLearners,
      verifiedLearners,
      newLearners,
      windowActiveIds,
      dauSet,
      wauSet,
      mauSet,
      timeseries,
      activationFunnel,
      retention,
    ] = await Promise.all([
      OwnerAnalyticsRepository.getTotalLearners(),
      OwnerAnalyticsRepository.getVerifiedLearnersCount(),
      OwnerAnalyticsRepository.getNewLearnersCount(startDate, endDate),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(startDate, endDate),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(oneDayAgo, now),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(sevenDaysAgo, now),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(thirtyDaysAgo, now),
      OwnerAnalyticsRepository.getGrowthTimeseries(startDate, endDate),
      OwnerAnalyticsRepository.getActivationFunnel(startDate, endDate),
      OwnerAnalyticsRepository.getRetentionCohorts(startDate, endDate, now),
    ]);

    const dau = dauSet.size;
    const wau = wauSet.size;
    const mau = mauSet.size;
    const stickiness = mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0;
    const verifiedRate = totalLearners > 0 ? Math.round((verifiedLearners / totalLearners) * 1000) / 10 : 0;

    const result = {
      window: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalLearners,
        verifiedLearners,
        verifiedRate,
        newLearners,
        activeInWindow: windowActiveIds.size,
        dau,
        wau,
        mau,
        stickiness,
      },
      timeseries,
      activationFunnel,
      retention,
    };

    this.setInCache(cacheKey, result);
    return result;
  }

  /**
   * Learning & Engagement Analytics
   */
  static async getLearningAnalytics(query?: AnalyticsQueryInput) {
    const { startDate, endDate, range } = this.resolveDateRange(query);
    const cacheKey = `learning:${range}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.getFromCache<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const [
      lessonProgressStats,
      practiceStats,
      quizStats,
      achievementsUnlocked,
      streakDistribution,
      windowActiveIds,
    ] = await Promise.all([
      OwnerAnalyticsRepository.getLessonProgressStats(startDate, endDate),
      OwnerAnalyticsRepository.getPracticeStats(startDate, endDate),
      OwnerAnalyticsRepository.getQuizStats(startDate, endDate),
      OwnerAnalyticsRepository.getAchievementsUnlockedCount(startDate, endDate),
      OwnerAnalyticsRepository.getStreakDistribution(),
      OwnerAnalyticsRepository.getMeaningfulActiveUserIds(startDate, endDate),
    ]);

    const activeLearnersCount = windowActiveIds.size;
    const sessionsPerActiveLearner =
      activeLearnersCount > 0
        ? Math.round((practiceStats.sessionCount / activeLearnersCount) * 10) / 10
        : 0;

    const result = {
      window: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      lessonProgress: lessonProgressStats,
      practice: {
        ...practiceStats,
        sessionsPerActiveLearner,
      },
      quizzes: quizStats,
      achievementsUnlocked,
      streakDistribution,
    };

    this.setInCache(cacheKey, result);
    return result;
  }

  /**
   * Content & Lesson Performance
   */
  static async getContentAnalytics(limit = 100) {
    const cacheKey = `content:${limit}`;
    const cached = this.getFromCache<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const lessons = await OwnerAnalyticsRepository.getContentPerformance(limit);

    const totalLessons = lessons.length;
    const publishedLessons = lessons.filter((l) => l.status === 'PUBLISHED').length;
    const totalCompletions = lessons.reduce((acc, l) => acc + l.completions, 0);
    const totalStarts = lessons.reduce((acc, l) => acc + l.starts, 0);
    const avgCompletionRate =
      totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 1000) / 10 : 0;
    const totalStalledLearners = lessons.reduce((acc, l) => acc + l.stalledLearners, 0);

    const result = {
      summary: {
        totalLessons,
        publishedLessons,
        avgCompletionRate,
        totalStalledLearners,
      },
      lessons,
    };

    this.setInCache(cacheKey, result);
    return result;
  }

  /**
   * Toggle user analytics exclusion attribute
   */
  static async setUserAnalyticsExcluded(
    targetUserId: string,
    excluded: boolean,
    actor: { id: string; email?: string }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, analyticsExcluded: true },
    });

    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    const previousValue = user.analyticsExcluded;
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { analyticsExcluded: excluded },
      select: { id: true, email: true, name: true, role: true, analyticsExcluded: true },
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: OWNER_AUDIT_ACTIONS.USER_ANALYTICS_EXCLUSION_CHANGED,
      entityType: 'User',
      entityId: targetUserId,
      before: { analyticsExcluded: previousValue, email: user.email },
      after: { analyticsExcluded: excluded, email: user.email },
    });

    // Invalidate analytics caches
    this.invalidateCache();

    return updated;
  }
}
