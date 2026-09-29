import { AnalyticsEvent, AnalyticsProvider } from './analytics-provider';
import { NoopAnalyticsProvider } from './providers/noop.provider';
import { PostHogAnalyticsProvider } from './providers/posthog.provider';

export const ANALYTICS_EVENTS = {
  USER_REGISTERED: 'user_registered',
  EMAIL_VERIFIED: 'email_verified',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LESSON_STARTED: 'lesson_started',
  LESSON_COMPLETED: 'lesson_completed',
  PRACTICE_STARTED: 'practice_started',
  PRACTICE_COMPLETED: 'practice_completed',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
} as const;

export class ProductAnalyticsService {
  private static providerInstance: AnalyticsProvider | null = null;

  public static getProvider(): AnalyticsProvider {
    if (this.providerInstance) {
      return this.providerInstance;
    }

    const providerType = (process.env.ANALYTICS_PROVIDER || 'noop').toLowerCase();
    const posthogApiKey = process.env.POSTHOG_API_KEY;

    if (providerType === 'posthog' && posthogApiKey) {
      this.providerInstance = new PostHogAnalyticsProvider({
        apiKey: posthogApiKey,
        host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
      });
      return this.providerInstance;
    }

    this.providerInstance = new NoopAnalyticsProvider();
    return this.providerInstance;
  }

  public static setProviderForTesting(provider: AnalyticsProvider | null): void {
    this.providerInstance = provider;
  }

  /**
   * Sanitizes event properties to ensure credentials and raw PII are never leaked to external analytics
   */
  public static sanitizeProperties(props?: Record<string, unknown>): Record<string, unknown> {
    if (!props) return {};
    const sanitized: Record<string, unknown> = {};
    const FORBIDDEN_KEYS = [
      'password',
      'passwordhash',
      'token',
      'tokenhash',
      'secret',
      'cookie',
      'jwt',
      'authorization',
      'email', // prefer distinctId (user ID) instead of raw email
    ];

    for (const [key, value] of Object.entries(props)) {
      if (FORBIDDEN_KEYS.some((f) => key.toLowerCase().includes(f))) {
        continue;
      }
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Dispatches a product analytics event non-blockingly and authoritatively isolated
   */
  public static async track(
    eventName: string,
    distinctId: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    try {
      const provider = this.getProvider();
      const sanitized = this.sanitizeProperties(properties);
      const event: AnalyticsEvent = {
        name: eventName,
        distinctId,
        properties: sanitized,
        timestamp: new Date(),
      };

      // Invariant: Non-blocking tracking. Do not await in a way that risks blocking transactional flows.
      await provider.capture(event);
    } catch (err: unknown) {
      console.warn('[ProductAnalyticsService] Non-fatal tracking error:', err instanceof Error ? err.message : err);
    }
  }

  public static async trackUserRegistered(userId: string, props?: { role?: string }): Promise<void> {
    return this.track(ANALYTICS_EVENTS.USER_REGISTERED, userId, props);
  }

  public static async trackEmailVerified(userId: string): Promise<void> {
    return this.track(ANALYTICS_EVENTS.EMAIL_VERIFIED, userId);
  }

  public static async trackOnboardingCompleted(
    userId: string,
    props?: { experienceLevel?: string; guitarType?: string; dailyGoalMinutes?: number }
  ): Promise<void> {
    return this.track(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, userId, props);
  }

  public static async trackLessonStarted(
    userId: string,
    props: { lessonId: string; slug?: string; moduleId?: string }
  ): Promise<void> {
    return this.track(ANALYTICS_EVENTS.LESSON_STARTED, userId, props);
  }

  public static async trackLessonCompleted(
    userId: string,
    props: { lessonId: string; xpEarned?: number }
  ): Promise<void> {
    return this.track(ANALYTICS_EVENTS.LESSON_COMPLETED, userId, props);
  }

  public static async trackPracticeCompleted(
    userId: string,
    props: { sessionType: string; durationSeconds: number; isValid: boolean }
  ): Promise<void> {
    return this.track(ANALYTICS_EVENTS.PRACTICE_COMPLETED, userId, props);
  }

  public static async trackQuizCompleted(
    userId: string,
    props: { quizId: string; score: number; passed: boolean; xpEarned?: number }
  ): Promise<void> {
    return this.track(ANALYTICS_EVENTS.QUIZ_COMPLETED, userId, props);
  }

  public static async trackAchievementUnlocked(
    userId: string,
    props: { achievementCode: string; xpReward: number }
  ): Promise<void> {
    return this.track(ANALYTICS_EVENTS.ACHIEVEMENT_UNLOCKED, userId, props);
  }
}
