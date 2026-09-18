import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { CurriculumService } from '@/services/curriculum.service';
import { LessonProgressStatus } from '@prisma/client';

describe('Curriculum & Lesson Availability Integration', () => {
  let userId = '';

  beforeAll(async () => {
    const user = await AuthService.register({
      name: 'Curriculum Tester',
      email: `curriculum_${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  it('determines lesson 1 is AVAILABLE and lesson 2 is LOCKED for new user', async () => {
    const learningPath = await CurriculumService.getLearningPath(userId);
    expect(learningPath.course.totalLessons).toBe(30);

    const mod1 = learningPath.modules[0];
    const lesson1 = mod1.lessons[0];
    const lesson2 = mod1.lessons[1];

    expect(lesson1.order).toBe(1);
    expect(lesson1.availability).toBe('AVAILABLE');

    expect(lesson2.order).toBe(2);
    expect(lesson2.availability).toBe('LOCKED');
  });

  it('allows opening lesson 1 and auto-initializes progress to IN_PROGRESS', async () => {
    const result = await CurriculumService.getLessonBySlug(userId, 'intro-to-guitar');
    expect(result.lesson.title).toBe('Introduction to Guitar');
    expect(result.availability).toBe('AVAILABLE');
    expect(result.progress.status).toBe(LessonProgressStatus.IN_PROGRESS);
  });

  it('rejects access to locked lesson 2 with forbidden error', async () => {
    await expect(
      CurriculumService.getLessonBySlug(userId, 'guitar-anatomy')
    ).rejects.toThrow(/locked/i);
  });

  it('updates lesson section progress and calculates percentage server-side', async () => {
    const lesson = await prisma.lesson.findFirst({ where: { slug: 'intro-to-guitar' } });
    expect(lesson).not.toBeNull();

    const updated = await CurriculumService.updateProgress(userId, lesson!.id, 2);
    expect(updated.currentSectionOrder).toBe(2);
    expect(updated.progressPercentage).toBeGreaterThan(0);
  });

  it('unlocks lesson 2 once lesson 1 is COMPLETED', async () => {
    const lesson1 = await prisma.lesson.findFirst({ where: { slug: 'intro-to-guitar' } });

    // Mark lesson 1 completed in DB
    await prisma.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId: lesson1!.id } },
      data: {
        status: LessonProgressStatus.COMPLETED,
        progressPercentage: 100,
        completedAt: new Date(),
      },
    });

    // Re-check learning path
    const learningPath = await CurriculumService.getLearningPath(userId);
    const mod1 = learningPath.modules[0];
    const l1 = mod1.lessons[0];
    const l2 = mod1.lessons[1];

    expect(l1.availability).toBe('COMPLETED');
    expect(l2.availability).toBe('AVAILABLE');

    // Now lesson 2 can be opened!
    const l2Result = await CurriculumService.getLessonBySlug(userId, 'guitar-anatomy');
    expect(l2Result.lesson.title).toBe('Guitar Anatomy');
    expect(l2Result.availability).toBe('AVAILABLE');
  });
});
