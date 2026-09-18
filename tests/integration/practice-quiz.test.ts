import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { PracticeService } from '@/services/practice.service';
import { QuizService } from '@/services/quiz.service';
import { PracticeType } from '@prisma/client';

describe('Practice & Quiz Engine Integration', () => {
  let userId = '';
  let quizId = '';

  beforeAll(async () => {
    const user = await AuthService.register({
      name: 'Practice Tester',
      email: `practice_${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    userId = user.id;

    // Fetch seeded quiz from lesson 1
    const quiz = await prisma.quiz.findFirst({
      include: { questions: { include: { options: true } } },
    });
    expect(quiz).not.toBeNull();
    quizId = quiz!.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  it('rejects short practice sessions (< 60s) and does not award XP', async () => {
    const result = await PracticeService.recordPracticeSession(userId, {
      practiceType: PracticeType.LESSON,
      durationSeconds: 35, // Below 60s threshold
    });

    expect(result.isValid).toBe(false);
    expect(result.xpAwarded).toBe(0);

    const profile = await prisma.profile.findUnique({ where: { userId } });
    expect(profile?.totalXP).toBe(0);
  });

  it('accepts valid practice sessions (>= 60s) and awards XP and updates streak', async () => {
    const result = await PracticeService.recordPracticeSession(userId, {
      practiceType: PracticeType.LESSON,
      durationSeconds: 70, // Above 60s threshold
    });

    expect(result.isValid).toBe(true);
    expect(result.xpAwarded).toBe(10);
    expect(result.currentStreak).toBe(1);

    const profile = await prisma.profile.findUnique({ where: { userId } });
    expect(profile?.totalXP).toBe(10);
    expect(profile?.currentStreak).toBe(1);
  });

  it('starts a quiz attempt without exposing isCorrect answers to client', async () => {
    const startResult = await QuizService.startAttempt(userId, quizId);
    expect(startResult.attemptId).toBeDefined();
    expect(startResult.questions.length).toBeGreaterThan(0);

    for (const q of startResult.questions) {
      for (const opt of q.options) {
        expect((opt as Record<string, unknown>).isCorrect).toBeUndefined();
      }
    }
  });

  it('scores quiz accurately, calculates pass, and awards XP for passing attempt', async () => {
    const startResult = await QuizService.startAttempt(userId, quizId);
    const attemptId = startResult.attemptId;

    // Look up correct options directly from database to test perfect submission
    const dbQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });

    const perfectAnswers = dbQuiz!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options.find((o) => o.isCorrect)!.id,
    }));

    const submitResult = await QuizService.submitAttempt(userId, attemptId, perfectAnswers);
    expect(submitResult.score).toBe(100);
    expect(submitResult.passed).toBe(true);
    // +10 XP for completion + 5 XP for perfect quiz = +15 XP
    expect(submitResult.xpAwarded).toBe(15);

    // Profile XP should reflect practice (10) + quiz (15) = 25 XP
    const profile = await prisma.profile.findUnique({ where: { userId } });
    expect(profile?.totalXP).toBe(25);
  });

  it('rejects duplicate submission of the same completed attempt', async () => {
    const startResult = await QuizService.startAttempt(userId, quizId);
    const attemptId = startResult.attemptId;

    await QuizService.submitAttempt(userId, attemptId, []);

    // Second attempt should fail
    await expect(
      QuizService.submitAttempt(userId, attemptId, [])
    ).rejects.toThrow(/already been submitted/i);
  });
});
