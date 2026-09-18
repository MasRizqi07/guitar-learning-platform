import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { QuizService } from '@/services/quiz.service';
import { PracticeService } from '@/services/practice.service';
import { CurriculumService } from '@/services/curriculum.service';
import { LessonCompletionService } from '@/services/lesson-completion.service';
import { PracticeType } from '@prisma/client';

describe('Security, IDOR & Anti-Cheat Integration Tests', () => {
  let userAId = '';
  let userBId = '';
  let testQuizId = '';
  let testLessonId = '';

  beforeAll(async () => {
    // 1. Create User A
    const userA = await AuthService.register({
      name: 'User Alpha',
      email: `alpha_${Date.now()}@example.com`,
      password: 'password12345',
    });
    userAId = userA.id;

    // 2. Create User B
    const userB = await AuthService.register({
      name: 'User Beta',
      email: `beta_${Date.now()}@example.com`,
      password: 'password12345',
    });
    userBId = userB.id;

    // 3. Find first lesson & quiz
    const lesson = await prisma.lesson.findFirst({
      where: { order: 1 },
      include: { quiz: true },
    });
    expect(lesson).not.toBeNull();
    testLessonId = lesson!.id;
    testQuizId = lesson!.quiz!.id;
  });

  afterAll(async () => {
    if (userAId) {
      await prisma.user.delete({ where: { id: userAId } }).catch(() => null);
    }
    if (userBId) {
      await prisma.user.delete({ where: { id: userBId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  describe('IDOR & Cross-User Protection', () => {
    it('prevents User A from submitting User B quiz attempt (403 Forbidden)', async () => {
      // User B starts a quiz attempt
      const attemptB = await QuizService.startAttempt(userBId, testQuizId);
      expect(attemptB.attemptId).toBeDefined();

      // User A attempts to submit User B's attempt
      await expect(
        QuizService.submitAttempt(userAId, attemptB.attemptId, [])
      ).rejects.toThrow(/do not have access to this quiz attempt/i);

      // Verify attempt is NOT marked completed
      const dbAttempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptB.attemptId },
      });
      expect(dbAttempt?.completedAt).toBeNull();
    });

    it('isolates lesson progress strictly per user session', async () => {
      // User A advances lesson to section 3
      await CurriculumService.updateProgress(userAId, testLessonId, 3);

      // Verify User A progress
      const progressA = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: userAId, lessonId: testLessonId } },
      });
      expect(progressA?.currentSectionOrder).toBe(3);

      // Verify User B progress is unaffected (null or untouched)
      const progressB = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: userBId, lessonId: testLessonId } },
      });
      expect(progressB).toBeNull();
    });

    it('isolates practice sessions and XP ledgers between users', async () => {
      // User A completes valid practice
      const resultA = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.LESSON,
        durationSeconds: 90,
      });
      expect(resultA.isValid).toBe(true);
      expect(resultA.xpAwarded).toBe(10);

      // Check User A profile XP
      const profileA = await prisma.profile.findUnique({ where: { userId: userAId } });
      expect(profileA?.totalXP).toBe(10);

      // Check User B profile XP - must remain 0
      const profileB = await prisma.profile.findUnique({ where: { userId: userBId } });
      expect(profileB?.totalXP).toBe(0);
    });
  });

  describe('Quiz Answer Protection', () => {
    it('ensures startAttempt strips isCorrect and correctAnswer from questions', async () => {
      const startResult = await QuizService.startAttempt(userAId, testQuizId);
      expect(startResult.questions.length).toBeGreaterThan(0);

      for (const q of startResult.questions) {
        // Must not expose answers or isCorrect
        expect((q as Record<string, unknown>).isCorrect).toBeUndefined();
        expect((q as Record<string, unknown>).correctAnswer).toBeUndefined();

        for (const opt of q.options) {
          expect((opt as Record<string, unknown>).isCorrect).toBeUndefined();
          expect((opt as Record<string, unknown>).correct).toBeUndefined();
        }
      }
    });

    it('handles answers with mismatched or invalid option IDs gracefully without scoring points', async () => {
      const startResult = await QuizService.startAttempt(userAId, testQuizId);
      const fakeAnswers = [
        {
          questionId: startResult.questions[0].id,
          selectedOptionId: 'non-existent-option-id-12345',
        },
      ];

      const submitResult = await QuizService.submitAttempt(userAId, startResult.attemptId, fakeAnswers);
      expect(submitResult.score).toBe(0);
      expect(submitResult.passed).toBe(false);
      expect(submitResult.correctCount).toBe(0);
    });
  });

  describe('Practice Anti-Cheat Rules', () => {
    it('rejects 0 seconds practice with 0 XP', async () => {
      const result = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.LESSON,
        durationSeconds: 0,
      });
      expect(result.isValid).toBe(false);
      expect(result.xpAwarded).toBe(0);
    });

    it('rejects 1 second practice with 0 XP', async () => {
      const result = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.LESSON,
        durationSeconds: 1,
      });
      expect(result.isValid).toBe(false);
      expect(result.xpAwarded).toBe(0);
    });

    it('enforces chord practice threshold (minimum 120 seconds)', async () => {
      const underThreshold = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.CHORD,
        durationSeconds: 119,
      });
      expect(underThreshold.isValid).toBe(false);
      expect(underThreshold.xpAwarded).toBe(0);

      const meetsThreshold = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.CHORD,
        durationSeconds: 120,
      });
      expect(meetsThreshold.isValid).toBe(true);
      expect(meetsThreshold.xpAwarded).toBe(10);
    });

    it('enforces daily practice threshold (minimum 300 seconds)', async () => {
      const underThreshold = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.DAILY,
        durationSeconds: 299,
      });
      expect(underThreshold.isValid).toBe(false);
      expect(underThreshold.xpAwarded).toBe(0);

      const meetsThreshold = await PracticeService.recordPracticeSession(userAId, {
        practiceType: PracticeType.DAILY,
        durationSeconds: 300,
      });
      expect(meetsThreshold.isValid).toBe(true);
      expect(meetsThreshold.xpAwarded).toBe(10);
    });
  });

  describe('Lesson Completion & XP Idempotency', () => {
    it('prevents repeated completions from awarding duplicate XP', async () => {
      // 1. Traverse all sections for User B on Lesson 1
      const lesson = await prisma.lesson.findUnique({
        where: { id: testLessonId },
        include: { sections: true },
      });
      const sectionCount = lesson!.sections.length;
      await CurriculumService.updateProgress(userBId, testLessonId, sectionCount);

      // 2. Pass quiz for User B
      const quiz = await prisma.quiz.findUnique({
        where: { id: testQuizId },
        include: { questions: { include: { options: true } } },
      });
      const attempt = await QuizService.startAttempt(userBId, testQuizId);
      const perfectAnswers = quiz!.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: q.options.find((o) => o.isCorrect)!.id,
      }));
      await QuizService.submitAttempt(userBId, attempt.attemptId, perfectAnswers);

      const profileBefore = await prisma.profile.findUnique({ where: { userId: userBId } });
      const initialXP = profileBefore?.totalXP ?? 0;

      // 3. Complete lesson first time
      const firstCompletion = await LessonCompletionService.completeLesson(userBId, testLessonId);
      expect(firstCompletion.alreadyCompleted).toBe(false);
      expect(firstCompletion.xpAwarded).toBeGreaterThan(0);

      const profileAfterFirst = await prisma.profile.findUnique({ where: { userId: userBId } });
      const xpAfterFirst = profileAfterFirst?.totalXP ?? 0;
      expect(xpAfterFirst).toBeGreaterThan(initialXP);

      // 4. Complete lesson second time (idempotent call)
      const secondCompletion = await LessonCompletionService.completeLesson(userBId, testLessonId);
      expect(secondCompletion.alreadyCompleted).toBe(true);
      expect(secondCompletion.xpAwarded).toBe(0);

      // Profile XP must remain identical
      const profileAfterSecond = await prisma.profile.findUnique({ where: { userId: userBId } });
      expect(profileAfterSecond?.totalXP).toBe(xpAfterFirst);
    });
  });
});
