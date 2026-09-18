import { describe, it, expect } from 'vitest';
import { calculateQuizScore, isQuizPassed } from '@/domain/quiz-evaluator';
import { calculateStreak } from '@/domain/streak';
import { calculateLevel } from '@/domain/level';
import { determineLessonAvailability } from '@/domain/availability';
import { validatePracticeDuration } from '@/domain/practice-validator';
import {
  calculateLessonProgress,
  calculateModuleProgress,
  calculateCourseProgress,
} from '@/domain/progress-calculator';

describe('Quiz Evaluation Domain', () => {
  it('correctly calculates percentage scores', () => {
    expect(calculateQuizScore(5, 5)).toBe(100);
    expect(calculateQuizScore(4, 5)).toBe(80);
    expect(calculateQuizScore(3, 5)).toBe(60);
    expect(calculateQuizScore(2, 5)).toBe(40);
    expect(calculateQuizScore(0, 5)).toBe(0);
    expect(calculateQuizScore(0, 0)).toBe(0);
  });

  it('determines passing threshold accurately', () => {
    expect(isQuizPassed(60)).toBe(true);
    expect(isQuizPassed(80)).toBe(true);
    expect(isQuizPassed(59)).toBe(false);
  });
});

describe('Streak Calculation Domain', () => {
  const tz = 'Asia/Jakarta';

  it('starts streak at 1 on first ever activity', () => {
    const res = calculateStreak(0, 0, null, tz, new Date('2026-09-18T10:00:00Z'));
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(1);
    expect(res.streakIncremented).toBe(true);
  });

  it('does not increment streak if active multiple times on same day', () => {
    const res = calculateStreak(3, 5, '2026-09-18', tz, new Date('2026-09-18T14:00:00Z'));
    expect(res.currentStreak).toBe(3);
    expect(res.longestStreak).toBe(5);
    expect(res.streakIncremented).toBe(false);
  });

  it('increments streak if active on consecutive day', () => {
    const res = calculateStreak(3, 3, '2026-09-17', tz, new Date('2026-09-18T10:00:00Z'));
    expect(res.currentStreak).toBe(4);
    expect(res.longestStreak).toBe(4);
    expect(res.streakIncremented).toBe(true);
  });

  it('resets streak to 1 if user skipped more than one day', () => {
    const res = calculateStreak(5, 10, '2026-09-15', tz, new Date('2026-09-18T10:00:00Z'));
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(10); // longest streak is preserved!
    expect(res.streakIncremented).toBe(true);
  });
});

describe('Level Progression Domain', () => {
  it('calculates level 1 for 0 to 99 XP', () => {
    const lvl0 = calculateLevel(0);
    expect(lvl0.level).toBe(1);
    expect(lvl0.progressPercent).toBe(0);

    const lvl50 = calculateLevel(50);
    expect(lvl50.level).toBe(1);
    expect(lvl50.progressPercent).toBe(50);
  });

  it('advances to level 2 at 100 XP', () => {
    const lvl100 = calculateLevel(100);
    expect(lvl100.level).toBe(2);
    expect(lvl100.progressPercent).toBe(0);
  });

  it('handles higher XP levels correctly', () => {
    const lvl3 = calculateLevel(300);
    expect(lvl3.level).toBe(3);
  });
});

describe('Lesson Availability Domain', () => {
  it('makes first lesson available by default', () => {
    const status = determineLessonAvailability({
      lessonOrder: 1,
      userCompletedLessonOrders: new Set(),
    });
    expect(status).toBe('AVAILABLE');
  });

  it('locks lesson 2 if lesson 1 is not completed', () => {
    const status = determineLessonAvailability({
      lessonOrder: 2,
      userCompletedLessonOrders: new Set(),
    });
    expect(status).toBe('LOCKED');
  });

  it('unlocks lesson 2 once lesson 1 is completed', () => {
    const status = determineLessonAvailability({
      lessonOrder: 2,
      userCompletedLessonOrders: new Set([1]),
    });
    expect(status).toBe('AVAILABLE');
  });

  it('shows COMPLETED if lesson is in user completed set', () => {
    const status = determineLessonAvailability({
      lessonOrder: 1,
      userCompletedLessonOrders: new Set([1]),
    });
    expect(status).toBe('COMPLETED');
  });

  it('honors placement starting order for intermediate beginners', () => {
    const status = determineLessonAvailability({
      lessonOrder: 6,
      userCompletedLessonOrders: new Set(),
      userStartingLessonOrder: 6, // placed at Module 2
    });
    expect(status).toBe('AVAILABLE');
  });
});

describe('Practice Duration Validation Domain', () => {
  it('rejects lesson practice under 60s', () => {
    const res = validatePracticeDuration('LESSON', 45);
    expect(res.isValid).toBe(false);
  });

  it('accepts lesson practice >= 60s', () => {
    const res = validatePracticeDuration('LESSON', 65);
    expect(res.isValid).toBe(true);
  });

  it('validates chord practice threshold (120s)', () => {
    expect(validatePracticeDuration('CHORD', 90).isValid).toBe(false);
    expect(validatePracticeDuration('CHORD', 120).isValid).toBe(true);
  });

  it('validates daily practice threshold (300s)', () => {
    expect(validatePracticeDuration('DAILY', 290).isValid).toBe(false);
    expect(validatePracticeDuration('DAILY', 300).isValid).toBe(true);
  });
});

describe('Progress Calculations Domain', () => {
  it('calculates lesson progress percentage', () => {
    expect(calculateLessonProgress(3, 5)).toBe(60);
    expect(calculateLessonProgress(5, 5)).toBe(100);
    expect(calculateLessonProgress(0, 5)).toBe(0);
  });

  it('calculates module progress percentage', () => {
    expect(calculateModuleProgress(2, 5)).toBe(40);
  });

  it('calculates course progress percentage', () => {
    expect(calculateCourseProgress(15, 30)).toBe(50);
  });
});
