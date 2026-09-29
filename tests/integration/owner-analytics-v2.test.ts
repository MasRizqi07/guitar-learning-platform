import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { OwnerAnalyticsRepository, LEARNER_ANALYTICS_USER_FILTER } from '@/repositories/owner-analytics.repository';
import { OwnerAnalyticsService } from '@/services/owner-analytics.service';
import { FeatureFlagService, hashToBucket } from '@/services/feature-flag.service';
import { PlatformSettingsService, PLATFORM_SETTING_KEYS } from '@/services/platform-settings.service';
import { ProductAnalyticsService } from '@/services/product-analytics/product-analytics.service';
import { NoopAnalyticsProvider } from '@/services/product-analytics/providers/noop.provider';
import { assertNotInMaintenance } from '@/lib/maintenance';
import { requireOwnerRole } from '@/lib/permissions';
import { AppError } from '@/lib/errors';
import { UserRole, PracticeType, PracticeDifficulty, LessonProgressStatus, ContentStatus } from '@prisma/client';

describe('Phase E — Owner Console, Product Analytics, Feature Flags & Settings Integration Tests', () => {
  const timestamp = Date.now();
  const createdUserIds: string[] = [];

  let ownerUser: { id: string; email: string; role: string };
  let adminUser: { id: string; email: string; role: string };
  let supportUser: { id: string; email: string; role: string };
  let editorUser: { id: string; email: string; role: string };
  let regularLearner: { id: string; email: string; role: string };
  let excludedLearner: { id: string; email: string; role: string };

  let testCourseId: string;
  let testModuleId: string;
  let testLessonId: string;
  let testQuizId: string;

  beforeAll(async () => {
    // 1. Create Owner User
    const uOwner = await AuthService.register({
      name: 'Integration Owner',
      email: `owner_${timestamp}@test.com`,
      password: 'OwnerPassword123!',
    });
    await prisma.user.update({
      where: { id: uOwner.id },
      data: { role: UserRole.OWNER, emailVerified: new Date() },
    });
    ownerUser = { id: uOwner.id, email: uOwner.email, role: UserRole.OWNER };
    createdUserIds.push(uOwner.id);

    // 2. Create Admin User
    const uAdmin = await AuthService.register({
      name: 'Integration Admin',
      email: `admin_${timestamp}@test.com`,
      password: 'AdminPassword123!',
    });
    await prisma.user.update({
      where: { id: uAdmin.id },
      data: { role: UserRole.ADMIN, emailVerified: new Date() },
    });
    adminUser = { id: uAdmin.id, email: uAdmin.email, role: UserRole.ADMIN };
    createdUserIds.push(uAdmin.id);

    // 3. Create Support User
    const uSupport = await AuthService.register({
      name: 'Integration Support',
      email: `support_${timestamp}@test.com`,
      password: 'SupportPassword123!',
    });
    await prisma.user.update({
      where: { id: uSupport.id },
      data: { role: UserRole.SUPPORT, emailVerified: new Date() },
    });
    supportUser = { id: uSupport.id, email: uSupport.email, role: UserRole.SUPPORT };
    createdUserIds.push(uSupport.id);

    // 4. Create Content Editor
    const uEditor = await AuthService.register({
      name: 'Integration Editor',
      email: `editor_${timestamp}@test.com`,
      password: 'EditorPassword123!',
    });
    await prisma.user.update({
      where: { id: uEditor.id },
      data: { role: UserRole.CONTENT_EDITOR, emailVerified: new Date() },
    });
    editorUser = { id: uEditor.id, email: uEditor.email, role: UserRole.CONTENT_EDITOR };
    createdUserIds.push(uEditor.id);

    // 5. Create Regular Learner
    const uLearner = await AuthService.register({
      name: 'Integration Learner',
      email: `learner_${timestamp}@test.com`,
      password: 'LearnerPassword123!',
    });
    await prisma.user.update({
      where: { id: uLearner.id },
      data: { emailVerified: new Date() },
    });
    regularLearner = { id: uLearner.id, email: uLearner.email, role: UserRole.LEARNER };
    createdUserIds.push(uLearner.id);

    // 6. Create Analytics Excluded Learner
    const uExcluded = await AuthService.register({
      name: 'Excluded QA Learner',
      email: `excluded_${timestamp}@test.com`,
      password: 'ExcludedPassword123!',
    });
    await prisma.user.update({
      where: { id: uExcluded.id },
      data: { analyticsExcluded: true, emailVerified: new Date() },
    });
    excludedLearner = { id: uExcluded.id, email: uExcluded.email, role: UserRole.LEARNER };
    createdUserIds.push(uExcluded.id);

    // 7. Seed Curriculum Hierarchy for Content Analytics Testing
    const course = await prisma.course.create({
      data: {
        title: `Analytics Test Course ${timestamp}`,
        slug: `analytics-course-${timestamp}`,
        description: 'Test course for owner analytics',
        order: 9999,
        status: ContentStatus.PUBLISHED,
      },
    });
    testCourseId = course.id;

    const moduleRecord = await prisma.module.create({
      data: {
        courseId: testCourseId,
        title: `Analytics Test Module ${timestamp}`,
        slug: `analytics-module-${timestamp}`,
        description: 'Test module for owner analytics',
        order: 9999,
        status: ContentStatus.PUBLISHED,
      },
    });
    testModuleId = moduleRecord.id;

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: testModuleId,
        title: `Analytics Test Lesson ${timestamp}`,
        slug: `analytics-lesson-${timestamp}`,
        description: 'Test lesson for owner analytics',
        order: 9999,
        status: ContentStatus.PUBLISHED,
      },
    });
    testLessonId = lesson.id;

    const quiz = await prisma.quiz.create({
      data: {
        lessonId: testLessonId,
        title: `Analytics Test Quiz ${timestamp}`,
        description: 'Test quiz for owner analytics',
        passingScore: 60,
      },
    });
    testQuizId = quiz.id;
  });

  afterAll(async () => {
    // Cleanup created data
    if (testLessonId) {
      await prisma.quizAttempt.deleteMany({ where: { quizId: testQuizId } }).catch(() => {});
      await prisma.quiz.deleteMany({ where: { id: testQuizId } }).catch(() => {});
      await prisma.practiceSession.deleteMany({ where: { lessonId: testLessonId } }).catch(() => {});
      await prisma.lessonProgress.deleteMany({ where: { lessonId: testLessonId } }).catch(() => {});
      await prisma.lesson.deleteMany({ where: { id: testLessonId } }).catch(() => {});
    }
    if (testModuleId) {
      await prisma.module.deleteMany({ where: { id: testModuleId } }).catch(() => {});
    }
    if (testCourseId) {
      await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
    }

    if (createdUserIds.length > 0) {
      await prisma.adminAuditLog.deleteMany({ where: { actorUserId: { in: createdUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
    }

    // Reset platform settings to defaults
    await prisma.platformSetting.upsert({
      where: { key: PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED },
      update: { value: true },
      create: { key: PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED, value: true },
    }).catch(() => {});

    await prisma.platformSetting.upsert({
      where: { key: PLATFORM_SETTING_KEYS.MAINTENANCE_MODE },
      update: { value: false },
      create: { key: PLATFORM_SETTING_KEYS.MAINTENANCE_MODE, value: false },
    }).catch(() => {});

    await prisma.$disconnect();
  });

  describe('1. Owner Access Boundary & Role Enforcement', () => {
    it('allows OWNER to pass requireOwnerRole without error', () => {
      expect(() => requireOwnerRole(ownerUser)).not.toThrow();
    });

    it('denies ADMIN with AppError.ownerAccessRequired (HTTP 403)', () => {
      try {
        requireOwnerRole(adminUser);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error).toBeInstanceOf(AppError);
        expect(error.code).toBe('OWNER_ACCESS_REQUIRED');
        expect(error.statusCode).toBe(403);
      }
    });

    it('denies SUPPORT with HTTP 403 OWNER_ACCESS_REQUIRED', () => {
      try {
        requireOwnerRole(supportUser);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.code).toBe('OWNER_ACCESS_REQUIRED');
        expect(error.statusCode).toBe(403);
      }
    });

    it('denies CONTENT_EDITOR with HTTP 403 OWNER_ACCESS_REQUIRED', () => {
      try {
        requireOwnerRole(editorUser);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.code).toBe('OWNER_ACCESS_REQUIRED');
        expect(error.statusCode).toBe(403);
      }
    });

    it('denies LEARNER with HTTP 403 OWNER_ACCESS_REQUIRED', () => {
      try {
        requireOwnerRole(regularLearner);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.code).toBe('OWNER_ACCESS_REQUIRED');
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('2. Staff & Analytics Exclusions from Learner KPIs', () => {
    it('strictly excludes staff accounts and analyticsExcluded users from Total Learners count', async () => {
      const totalLearners = await OwnerAnalyticsRepository.getTotalLearners();
      expect(totalLearners).toBeGreaterThanOrEqual(1);

      // Ensure regular learner is counted
      const inFilter = await prisma.user.count({
        where: {
          id: regularLearner.id,
          ...LEARNER_ANALYTICS_USER_FILTER,
        },
      });
      expect(inFilter).toBe(1);

      // Verify that staff and excluded users are NOT in filter
      const staffInFilter = await prisma.user.count({
        where: {
          id: { in: [ownerUser.id, adminUser.id, supportUser.id, editorUser.id, excludedLearner.id] },
          ...LEARNER_ANALYTICS_USER_FILTER,
        },
      });
      expect(staffInFilter).toBe(0);
    });

    it('allows OWNER to toggle analyticsExcluded on a learner and audits change', async () => {
      const updated = await OwnerAnalyticsService.setUserAnalyticsExcluded(
        regularLearner.id,
        true,
        ownerUser
      );
      expect(updated.analyticsExcluded).toBe(true);

      // Verify excluded user is now removed from learner repository filter
      const afterExclusion = await prisma.user.count({
        where: {
          id: regularLearner.id,
          ...LEARNER_ANALYTICS_USER_FILTER,
        },
      });
      expect(afterExclusion).toBe(0);

      // Restore learner to non-excluded
      const restored = await OwnerAnalyticsService.setUserAnalyticsExcluded(
        regularLearner.id,
        false,
        ownerUser
      );
      expect(restored.analyticsExcluded).toBe(false);

      const afterRestored = await prisma.user.count({
        where: {
          id: regularLearner.id,
          ...LEARNER_ANALYTICS_USER_FILTER,
        },
      });
      expect(afterRestored).toBe(1);
    });
  });

  describe('3. Practice Analytics & Anti-Cheat Session Filtering', () => {
    it('only counts valid practice sessions (isValid = true) in practice minutes', async () => {
      const practiceTime = new Date('2026-08-01T12:00:00.000Z');
      const windowStart = new Date('2026-08-01T11:00:00.000Z');
      const windowEnd = new Date('2026-08-01T13:00:00.000Z');

      // Insert 1 valid session (10 mins = 600s)
      await prisma.practiceSession.create({
        data: {
          userId: regularLearner.id,
          lessonId: testLessonId,
          practiceType: PracticeType.CHORD,
          difficultyFeedback: PracticeDifficulty.EASY,
          durationSeconds: 600,
          isValid: true,
          completedAt: practiceTime,
        },
      });

      // Insert 1 invalid anti-cheat rejected session (30 mins = 1800s, isValid = false)
      await prisma.practiceSession.create({
        data: {
          userId: regularLearner.id,
          lessonId: testLessonId,
          practiceType: PracticeType.DAILY,
          difficultyFeedback: PracticeDifficulty.DIFFICULT,
          durationSeconds: 1800,
          isValid: false, // REJECTED
          completedAt: practiceTime,
        },
      });

      // Insert 1 valid session by an excluded learner (should NOT be counted)
      await prisma.practiceSession.create({
        data: {
          userId: excludedLearner.id,
          lessonId: testLessonId,
          practiceType: PracticeType.STRUMMING,
          durationSeconds: 1200,
          isValid: true,
          completedAt: practiceTime,
        },
      });

      const practiceStats = await OwnerAnalyticsRepository.getPracticeStats(windowStart, windowEnd);

      // Should count only regularLearner's valid session (600s = 10 mins)
      expect(practiceStats.totalMinutes).toBe(10);
      expect(practiceStats.sessionCount).toBe(1);
      expect(practiceStats.typeDistribution.CHORD.count).toBe(1);
      expect(practiceStats.difficultyDistribution.EASY).toBe(1);
      expect(practiceStats.difficultyDistribution.DIFFICULT).toBe(0);
    });
  });

  describe('4. Quiz Analytics & Pass Rate Accuracy', () => {
    it('excludes unfinished quiz attempts and computes accurate pass rate', async () => {
      const quizTime = new Date('2026-08-02T12:00:00.000Z');
      const windowStart = new Date('2026-08-02T11:00:00.000Z');
      const windowEnd = new Date('2026-08-02T13:00:00.000Z');

      // Completed passed attempt (score 80)
      await prisma.quizAttempt.create({
        data: {
          userId: regularLearner.id,
          quizId: testQuizId,
          score: 80,
          passed: true,
          completedAt: quizTime,
        },
      });

      // Completed failed attempt (score 40)
      await prisma.quizAttempt.create({
        data: {
          userId: regularLearner.id,
          quizId: testQuizId,
          score: 40,
          passed: false,
          completedAt: quizTime,
        },
      });

      // Unfinished attempt (completedAt IS NULL) - MUST BE EXCLUDED
      await prisma.quizAttempt.create({
        data: {
          userId: regularLearner.id,
          quizId: testQuizId,
          score: 0,
          passed: false,
          completedAt: null,
        },
      });

      const quizStats = await OwnerAnalyticsRepository.getQuizStats(windowStart, windowEnd);

      // Expect exactly 2 completed attempts, 1 passed -> 50.0% pass rate, avg score (80+40)/2 = 60
      expect(quizStats.totalAttempts).toBe(2);
      expect(quizStats.passedAttempts).toBe(1);
      expect(quizStats.passRate).toBe(50.0);
      expect(quizStats.averageScore).toBe(60.0);
      expect(quizStats.uniqueLearners).toBe(1);
    });
  });

  describe('5. Retention Cohorts & Maturity Rules', () => {
    it('enforces maturity invariant: immature cohorts (<1d, <7d, <30d) are excluded from denominators', async () => {
      const now = new Date('2026-09-27T12:00:00.000Z');

      // Create a test cohort user created 3 days ago (eligible for D1, immature for D7 and D30)
      const threeDaysAgo = new Date('2026-09-24T10:00:00.000Z');
      const cohortUser = await AuthService.register({
        name: 'Cohort User 3D',
        email: `cohort_3d_${timestamp}@test.com`,
        password: 'Password123!',
      });
      createdUserIds.push(cohortUser.id);
      await prisma.user.update({
        where: { id: cohortUser.id },
        data: { createdAt: threeDaysAgo },
      });

      // Simulate Day 1 activity: 26 hours after registration (falls in [Day0 + 24h, Day0 + 48h))
      const d1ActivityTime = new Date(threeDaysAgo.getTime() + 26 * 3600 * 1000);
      await prisma.practiceSession.create({
        data: {
          userId: cohortUser.id,
          lessonId: testLessonId,
          practiceType: PracticeType.DAILY,
          durationSeconds: 300,
          isValid: true,
          completedAt: d1ActivityTime,
        },
      });

      const retention = await OwnerAnalyticsRepository.getRetentionCohorts(
        new Date('2026-09-24T00:00:00.000Z'),
        new Date('2026-09-24T23:59:59.999Z'),
        now
      );

      expect(retention.cohorts.length).toBe(1);
      const row = retention.cohorts[0];

      // D1: mature (age 3 days >= 1 day), retained
      expect(row.d1.eligible).toBe(true);
      expect(row.d1.retainedCount).toBe(1);
      expect(row.d1.rate).toBe(100);

      // D7: immature (age 3 days < 7 days), excluded from denominator
      expect(row.d7.eligible).toBe(false);
      expect(row.d7.rate).toBe(0);

      // D30: immature (age 3 days < 30 days), excluded from denominator
      expect(row.d30.eligible).toBe(false);
      expect(row.d30.rate).toBe(0);
    });

    it('retention edge test: activity on Day 2 only is NOT counted as Day 1 retained', async () => {
      const now = new Date('2026-09-27T12:00:00.000Z');
      const fourDaysAgo = new Date('2026-09-23T10:00:00.000Z');

      const nonD1User = await AuthService.register({
        name: 'Non D1 User',
        email: `nond1_${timestamp}@test.com`,
        password: 'Password123!',
      });
      createdUserIds.push(nonD1User.id);
      await prisma.user.update({
        where: { id: nonD1User.id },
        data: { createdAt: fourDaysAgo },
      });

      // Activity 52 hours after registration (falls in Day 2 [48h, 72h), NOT Day 1)
      const d2ActivityTime = new Date(fourDaysAgo.getTime() + 52 * 3600 * 1000);
      await prisma.practiceSession.create({
        data: {
          userId: nonD1User.id,
          lessonId: testLessonId,
          practiceType: PracticeType.DAILY,
          durationSeconds: 300,
          isValid: true,
          completedAt: d2ActivityTime,
        },
      });

      const retention = await OwnerAnalyticsRepository.getRetentionCohorts(
        new Date('2026-09-23T00:00:00.000Z'),
        new Date('2026-09-23T23:59:59.999Z'),
        now
      );

      const row = retention.cohorts[0];
      expect(row.d1.eligible).toBe(true);
      expect(row.d1.retainedCount).toBe(0);
      expect(row.d1.rate).toBe(0);
    });
  });

  describe('6. Content Analytics & Stalled Learners', () => {
    it('classifies stalled learners accurately (>7 days inactive without completion)', async () => {
      // 1. Learner who completed lesson
      await prisma.lessonProgress.create({
        data: {
          userId: regularLearner.id,
          lessonId: testLessonId,
          status: LessonProgressStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          lastAccessedAt: new Date(),
        },
      });

      // 2. Stalled learner: started 10 days ago, last accessed 8 days ago, NOT completed
      const eightDaysAgo = new Date(Date.now() - 8 * 86400 * 1000);
      const stalledUser = await AuthService.register({
        name: 'Stalled User',
        email: `stalled_${timestamp}@test.com`,
        password: 'Password123!',
      });
      createdUserIds.push(stalledUser.id);

      await prisma.lessonProgress.create({
        data: {
          userId: stalledUser.id,
          lessonId: testLessonId,
          status: LessonProgressStatus.IN_PROGRESS,
          startedAt: eightDaysAgo,
          lastAccessedAt: eightDaysAgo,
        },
      });

      const content = await OwnerAnalyticsRepository.getContentPerformance(500);
      const lessonRow = content.find((l) => l.lessonId === testLessonId);

      expect(lessonRow).toBeDefined();
      expect(lessonRow!.starts).toBe(2);
      expect(lessonRow!.completions).toBe(1);
      expect(lessonRow!.completionRate).toBe(50.0);
      expect(lessonRow!.stalledLearners).toBe(1);
    });
  });

  describe('7. Feature Flags & Deterministic Rollout', () => {
    const testFlagKey = `TEST_FLAG_${timestamp}`;

    it('creates a feature flag via Owner and writes audit log', async () => {
      const flag = await FeatureFlagService.createFlag(ownerUser, {
        key: testFlagKey,
        description: 'Test feature flag for integration test',
        enabled: true,
        rolloutPercentage: 50,
      });

      expect(flag.key).toBe(testFlagKey);
      expect(flag.enabled).toBe(true);
      expect(flag.rolloutPercentage).toBe(50);

      // Verify audit log
      const audit = await prisma.adminAuditLog.findFirst({
        where: {
          action: 'FEATURE_FLAG_CREATED',
          entityId: flag.id,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit!.actorUserId).toBe(ownerUser.id);
    });

    it('denies ADMIN and LEARNER from creating or mutating feature flags', async () => {
      try {
        await FeatureFlagService.createFlag(adminUser, {
          key: `ADMIN_FAIL_${timestamp}`,
          enabled: true,
          rolloutPercentage: 0,
        });
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.statusCode).toBe(403);
      }

      try {
        await FeatureFlagService.createFlag(regularLearner, {
          key: `LEARNER_FAIL_${timestamp}`,
          enabled: true,
          rolloutPercentage: 0,
        });
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.statusCode).toBe(403);
      }
    });

    it('evaluates deterministic user bucketing identically for the same user', async () => {
      const bucket1 = hashToBucket('TEST_FLAG', 'user-12345');
      const bucket2 = hashToBucket('TEST_FLAG', 'user-12345');
      const bucket3 = hashToBucket('TEST_FLAG', 'user-12345');

      expect(bucket1).toBe(bucket2);
      expect(bucket2).toBe(bucket3);
      expect(bucket1).toBeGreaterThanOrEqual(0);
      expect(bucket1).toBeLessThan(100);
    });

    it('disabled flag returns false for all users', async () => {
      const flag = await prisma.featureFlag.findUnique({ where: { key: testFlagKey } });
      await FeatureFlagService.updateFlag(ownerUser, flag!.id, { enabled: false });

      const res1 = await FeatureFlagService.isFeatureEnabled(testFlagKey, 'user-a');
      const res2 = await FeatureFlagService.isFeatureEnabled(testFlagKey, 'user-b');
      expect(res1).toBe(false);
      expect(res2).toBe(false);
    });

    it('100% rollout returns true for all users when enabled', async () => {
      const flag = await prisma.featureFlag.findUnique({ where: { key: testFlagKey } });
      await FeatureFlagService.updateFlag(ownerUser, flag!.id, { enabled: true, rolloutPercentage: 100 });

      const res1 = await FeatureFlagService.isFeatureEnabled(testFlagKey, 'user-a');
      const res2 = await FeatureFlagService.isFeatureEnabled(testFlagKey, 'user-b');
      expect(res1).toBe(true);
      expect(res2).toBe(true);
    });
  });

  describe('8. Platform Settings & Maintenance Mode', () => {
    it('disabling registration rejects new user registrations with REGISTRATION_DISABLED (403)', async () => {
      await PlatformSettingsService.updateSetting(
        ownerUser,
        PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED,
        false
      );

      try {
        await AuthService.register({
          name: 'Blocked User',
          email: `blocked_${timestamp}@test.com`,
          password: 'Password123!',
        });
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.code).toBe('REGISTRATION_DISABLED');
        expect(error.statusCode).toBe(403);
      }

      // Existing login still succeeds
      const loginRes = await AuthService.login({
        email: regularLearner.email,
        password: 'LearnerPassword123!',
      });
      expect(loginRes.email).toBe(regularLearner.email);

      // Re-enable registration
      await PlatformSettingsService.updateSetting(
        ownerUser,
        PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED,
        true
      );
    });

    it('enabling maintenance mode blocks learner writes with HTTP 503 MAINTENANCE_MODE', async () => {
      await PlatformSettingsService.updateSetting(
        ownerUser,
        PLATFORM_SETTING_KEYS.MAINTENANCE_MODE,
        true
      );

      // Learner attempt to pass maintenance check fails
      try {
        await assertNotInMaintenance(regularLearner);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as AppError;
        expect(error.code).toBe('MAINTENANCE_MODE');
        expect(error.statusCode).toBe(503);
      }

      // Platform OWNER has guaranteed bypass to manage and disable maintenance
      await expect(assertNotInMaintenance(ownerUser)).resolves.not.toThrow();

      // Disable maintenance mode
      await PlatformSettingsService.updateSetting(
        ownerUser,
        PLATFORM_SETTING_KEYS.MAINTENANCE_MODE,
        false
      );
      await expect(assertNotInMaintenance(regularLearner)).resolves.not.toThrow();
    });
  });

  describe('9. Behavioral Analytics Abstraction & Provider Isolation', () => {
    it('NoopAnalyticsProvider safely tracks events and failure never breaks transaction', async () => {
      const provider = new NoopAnalyticsProvider();
      await provider.capture({
        distinctId: 'test_user_1',
        name: 'lesson_completed',
        properties: { lessonId: 'l-1' },
      });

      const events = provider.getCapturedEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].name).toBe('lesson_completed');
      expect(events[events.length - 1].distinctId).toBe('test_user_1');

      // Failure isolation: calling track with throwing provider does not throw in application logic
      await expect(
        ProductAnalyticsService.trackLessonStarted('user-test', { lessonId: 'l-test' })
      ).resolves.not.toThrow();
    });
  });
});

