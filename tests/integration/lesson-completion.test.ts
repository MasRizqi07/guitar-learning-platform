import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { CurriculumService } from '@/services/curriculum.service';
import { LessonCompletionService } from '@/services/lesson-completion.service';
import { QuizService } from '@/services/quiz.service';

describe('Transactional Lesson Completion Integration', () => {
  let userId = '';
  let lesson1Id = '';
  let quizId = '';

  beforeAll(async () => {
    const user = await AuthService.register({
      name: 'Completion Tester',
      email: `complete_${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    userId = user.id;

    // Load Lesson 1 with its Quiz
    const lesson1 = await prisma.lesson.findFirst({
      where: { slug: 'intro-to-guitar' },
      include: { sections: true, quiz: true },
    });
    expect(lesson1).not.toBeNull();
    lesson1Id = lesson1!.id;
    quizId = lesson1!.quiz!.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  it('rejects lesson completion if required sections are incomplete', async () => {
    await expect(
      LessonCompletionService.completeLesson(userId, lesson1Id)
    ).rejects.toThrow(/sections must be completed/i);
  });

  it('rejects lesson completion if quiz has not been passed', async () => {
    // Set sections to complete
    await CurriculumService.updateProgress(userId, lesson1Id, 4);

    await expect(
      LessonCompletionService.completeLesson(userId, lesson1Id)
    ).rejects.toThrow(/must pass the lesson quiz/i);
  });

  it('successfully completes lesson atomically once sections & quiz are passed', async () => {
    // 1. Pass the quiz
    const attempt = await QuizService.startAttempt(userId, quizId);
    const dbQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });

    const answers = dbQuiz!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: q.options.find((o) => o.isCorrect)!.id,
    }));
    await QuizService.submitAttempt(userId, attempt.attemptId, answers);

    // 2. Complete Lesson
    const result = await LessonCompletionService.completeLesson(userId, lesson1Id);
    expect(result.alreadyCompleted).toBe(false);
    expect(result.lessonId).toBe(lesson1Id);
    expect(result.currentStreak).toBe(1);
    expect(result.unlockedAchievements).toContain('First Step');

    // 3. Verify database state
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson1Id } },
    });
    expect(progress?.status).toBe('COMPLETED');
    expect(progress?.progressPercentage).toBe(100);

    const userAch = await prisma.userAchievement.findMany({ where: { userId } });
    expect(userAch.length).toBeGreaterThan(0);
  });

  it('is idempotent: retrying completion does not duplicate XP or rewards', async () => {
    const profileBefore = await prisma.profile.findUnique({ where: { userId } });
    const xpBefore = profileBefore?.totalXP || 0;

    const retryResult = await LessonCompletionService.completeLesson(userId, lesson1Id);
    expect(retryResult.alreadyCompleted).toBe(true);
    expect(retryResult.xpAwarded).toBe(0);

    const profileAfter = await prisma.profile.findUnique({ where: { userId } });
    expect(profileAfter?.totalXP).toBe(xpBefore); // XP unchanged!
  });

  it('makes lesson 2 accessible in the learning path', async () => {
    const learningPath = await CurriculumService.getLearningPath(userId);
    const lesson2 = learningPath.modules[0].lessons[1];
    expect(lesson2.availability).toBe('AVAILABLE');
  });
});
