import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { OnboardingService } from '@/services/onboarding.service';
import { DashboardService } from '@/services/dashboard.service';
import { CurriculumService } from '@/services/curriculum.service';
import { CurriculumRepository } from '@/repositories/curriculum.repository';
import { PracticeService } from '@/services/practice.service';
import { QuizService } from '@/services/quiz.service';
import { LessonCompletionService } from '@/services/lesson-completion.service';
import { ProgressService } from '@/services/progress.service';
import { ProfileService } from '@/services/profile.service';
import { ExperienceLevel, GuitarType, PracticeType, PracticeDifficulty } from '@prisma/client';

describe('Phase 10: Golden Path Release Gate (End-to-End Workflow)', () => {
  const testEmail = `golden-user-${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let userId: string;
  let lesson1Id: string;
  let lesson2Id: string;
  let quizId: string;

  beforeAll(async () => {
    // Ensure Course and seed data are ready
    const course = await prisma.course.findFirst({
      where: { slug: 'beginner-guitar-fundamentals' },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: { quiz: true, sections: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found in database. Did you run prisma/seed.ts?');
    }

    const firstModule = course.modules[0];
    lesson1Id = firstModule.lessons[0].id;
    lesson2Id = firstModule.lessons[1].id;
    quizId = firstModule.lessons[0].quiz!.id;
  });

  it('Step 1 & 2: User registers and logs in with fresh state', async () => {
    const sessionUser = await AuthService.register({
      name: 'Golden Tester',
      email: testEmail,
      password: testPassword,
    });

    expect(sessionUser).toBeDefined();
    expect(sessionUser.email).toBe(testEmail.toLowerCase());
    userId = sessionUser.id;

    // Verify initial profile in database
    const initialProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(initialProfile?.totalXP).toBe(0);
    expect(initialProfile?.currentStreak).toBe(0);

    // Verify login verification
    const loginResult = await AuthService.login({
      email: testEmail,
      password: testPassword,
    });
    expect(loginResult.id).toBe(userId);
    expect(loginResult.email).toBe(testEmail.toLowerCase());
  });

  it('Step 3 & 4: User completes Onboarding & receives Placement', async () => {
    const onboardingResult = await OnboardingService.completeOnboarding(userId, {
      experienceLevel: ExperienceLevel.ABSOLUTE_BEGINNER,
      guitarType: GuitarType.ACOUSTIC,
      dailyGoalMinutes: 15,
      learningGoalCodes: ['PLAY_FAVORITE_SONGS', 'LEARN_FROM_ZERO'],
      assessmentScore: 0,
      timezone: 'Asia/Jakarta',
    });

    expect(onboardingResult.onboarding.completed).toBe(true);
    expect(onboardingResult.onboarding.dailyGoalMinutes).toBe(15);
    expect(onboardingResult.recommendedLevel).toBe('BEGINNER_1');
    expect(onboardingResult.startingLessonOrder).toBe(1);

    // Verify persisted in DB
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { onboardingProfile: true, userLearningGoals: true },
    });
    expect(dbUser?.onboardingProfile?.completed).toBe(true);
    expect(dbUser?.userLearningGoals.length).toBe(2);
  });

  it('Step 5: User opens Dashboard and sees Next Action', async () => {
    const dashboard = await DashboardService.getDashboardData(userId);

    expect(dashboard.user.name).toBe('Golden Tester');
    expect(dashboard.profile.totalXP).toBe(0);
    expect(dashboard.profile.currentStreak).toBe(0);
    expect(dashboard.dailyGoal.dailyGoalMinutes).toBe(15);
    expect(dashboard.dailyGoal.todayMinutes).toBe(0);
    expect(dashboard.courseProgress.completedLessons).toBe(0);
    expect(dashboard.nextAction.title).toContain('Introduction to Guitar');
  });

  it('Step 6: Dynamic Lesson Availability - Lesson 1 is AVAILABLE, Lesson 2 is LOCKED', async () => {
    const learningPath = await CurriculumService.getLearningPath(userId);
    const mod1 = learningPath.modules[0];

    const l1 = mod1.lessons.find((l) => l.id === lesson1Id);
    expect(l1?.availability).toBe('AVAILABLE');

    const l2 = mod1.lessons.find((l) => l.id === lesson2Id);
    expect(l2?.availability).toBe('LOCKED');
  });

  it('Step 7: User consumes Lesson Sections', async () => {
    const lessonData = await CurriculumService.getLessonBySlug(userId, 'intro-to-guitar');
    expect(lessonData.lesson.title).toBe('Introduction to Guitar');
    expect(lessonData.lesson.sections.length).toBeGreaterThan(0);

    // Mark sections completed
    const sectionOrders = lessonData.lesson.sections.map((s) => s.order);
    for (const order of sectionOrders) {
      await CurriculumService.updateProgress(userId, lesson1Id, order);
    }

    const progress = await CurriculumRepository.getSingleLessonProgress(userId, lesson1Id);
    expect(progress?.status).toBe('IN_PROGRESS');
    expect(progress?.currentSectionOrder).toBe(sectionOrders.length);
  });

  it('Step 8: User completes Required Practice with anti-cheat validation', async () => {
    // Attempting too-short practice (< 60s) returns isValid: false
    const shortPractice = await PracticeService.recordPracticeSession(userId, {
      lessonId: lesson1Id,
      practiceType: PracticeType.LESSON,
      durationSeconds: 30, // Below 60s threshold
      difficultyFeedback: PracticeDifficulty.OKAY,
    });
    expect(shortPractice.isValid).toBe(false);
    expect(shortPractice.xpAwarded).toBe(0);

    // Valid practice (75s >= 60s) succeeds
    const practice = await PracticeService.recordPracticeSession(userId, {
      lessonId: lesson1Id,
      practiceType: PracticeType.LESSON,
      durationSeconds: 75,
      difficultyFeedback: PracticeDifficulty.OKAY,
    });

    expect(practice.isValid).toBe(true);
    expect(practice.xpAwarded).toBeGreaterThan(0);
  });

  it('Step 9: User starts Quiz and passes with server-calculated score', async () => {
    const attempt = await QuizService.startAttempt(userId, quizId);
    expect(attempt.questions.length).toBeGreaterThan(0);

    // Verify answers do not leak isCorrect
    for (const q of attempt.questions) {
      for (const opt of q.options) {
        expect((opt as Record<string, unknown>).isCorrect).toBeUndefined();
      }
    }

    // Fetch question IDs and correct options directly from database to simulate user answering correctly
    const quizDetails = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });

    const userAnswers = quizDetails!.questions.map((q) => {
      const correctOpt = q.options.find((o) => o.isCorrect)!;
      return {
        questionId: q.id,
        selectedOptionId: correctOpt.id,
      };
    });

    const submitResult = await QuizService.submitAttempt(userId, attempt.attemptId, userAnswers);
    expect(submitResult.score).toBe(100);
    expect(submitResult.passed).toBe(true);
  });

  it('Step 10: Atomic Transactional Lesson Completion awards XP, streak, and achievements', async () => {
    const result = await LessonCompletionService.completeLesson(userId, lesson1Id);

    expect(result.alreadyCompleted).toBe(false);
    expect(result.xpAwarded).toBeGreaterThanOrEqual(20);
    expect(result.currentStreak).toBe(1);

    // Verify FIRST_STEP achievement was unlocked
    expect(result.unlockedAchievements).toContain('First Step');

    // Verify activity logged
    const activities = await prisma.learningActivity.findMany({
      where: { userId },
    });
    expect(activities.some((a) => a.type === 'LESSON_COMPLETED')).toBe(true);
  });

  it('Step 11: Idempotency Protection - Retrying completion does NOT duplicate XP or rewards', async () => {
    const profileBefore = await prisma.profile.findUnique({ where: { userId } });
    const xpBefore = profileBefore!.totalXP;

    const retryResult = await LessonCompletionService.completeLesson(userId, lesson1Id);

    expect(retryResult.alreadyCompleted).toBe(true);
    expect(retryResult.xpAwarded).toBe(0); // No duplicate XP awarded!
    expect(retryResult.unlockedAchievements.length).toBe(0); // No duplicate achievements!

    const profileAfter = await prisma.profile.findUnique({ where: { userId } });
    expect(profileAfter!.totalXP).toBe(xpBefore);
  });

  it('Step 12: Next Lesson (Lesson 2) dynamically becomes AVAILABLE', async () => {
    const learningPath = await CurriculumService.getLearningPath(userId);
    const mod1 = learningPath.modules[0];
    const l2 = mod1.lessons.find((l) => l.id === lesson2Id);

    expect(l2?.availability).toBe('AVAILABLE');
  });

  it('Step 13: Progress & Analytics reflect persisted progression', async () => {
    const progress = await ProgressService.getProgressOverview(userId);

    expect(progress.curriculum.completedLessons).toBe(1);
    expect(progress.practice.totalMinutes).toBeGreaterThanOrEqual(1);
    expect(progress.profile.currentStreak).toBe(1);
    expect(progress.xpLedger.length).toBeGreaterThan(0);
    expect(progress.curriculum.modules[0].progressPercentage).toBeGreaterThan(0);
  });

  it('Step 14 & 15: Profile & Settings can be updated and are persisted', async () => {
    const profile = await ProfileService.getFullProfile(userId);

    expect(profile.user.name).toBe('Golden Tester');
    expect(profile.stats.completedLessonsCount).toBe(1);
    expect(profile.stats.unlockedAchievementsCount).toBeGreaterThanOrEqual(1);

    // Update settings
    const updated = await ProfileService.updateProfile(userId, {
      name: 'Golden Guitarist',
      dailyGoalMinutes: 30,
      timezone: 'Europe/London',
    });

    expect(updated.user.name).toBe('Golden Guitarist');
    expect(updated.onboarding?.dailyGoalMinutes).toBe(30);
    expect(updated.profile?.timezone).toBe('Europe/London');
  });

  it('Step 16: Session Reload & Multi-session persistence', async () => {
    // Re-login through AuthService
    const reloadedUser = await AuthService.login({
      email: testEmail,
      password: testPassword,
    });

    expect(reloadedUser.name).toBe('Golden Guitarist');

    const dbProfile = await prisma.profile.findUnique({ where: { userId } });
    expect(dbProfile?.totalXP).toBeGreaterThanOrEqual(20);
    expect(dbProfile?.currentStreak).toBe(1);
    expect(dbProfile?.timezone).toBe('Europe/London');

    const lesson1Progress = await CurriculumRepository.getSingleLessonProgress(userId, lesson1Id);
    expect(lesson1Progress?.status).toBe('COMPLETED');

    const learningPath = await CurriculumService.getLearningPath(userId);
    const l2 = learningPath.modules[0].lessons.find((l) => l.id === lesson2Id);
    expect(l2?.availability).toBe('AVAILABLE');
  });
});
