export const PRACTICE_THRESHOLDS = {
  LESSON: 60, // seconds
  CHORD: 120,
  CHORD_TRANSITION: 120,
  STRUMMING: 120,
  DAILY: 300,
} as const;

export const XP_VALUES = {
  LESSON_COMPLETE: 20,
  PRACTICE_COMPLETE: 10,
  QUIZ_COMPLETE: 10,
  PERFECT_QUIZ: 5,
  DAILY_GOAL: 10,
} as const;

export const QUIZ_PASSING_SCORE = 60; // percentage

export const VALID_DAILY_GOAL_MINUTES = [10, 15, 30, 45, 60] as const;
export type ValidDailyGoalMinutes = (typeof VALID_DAILY_GOAL_MINUTES)[number];

export const LEVEL_THRESHOLDS = [
  { level: 1, minXP: 0 },
  { level: 2, minXP: 100 },
  { level: 3, minXP: 250 },
  { level: 4, minXP: 450 },
  { level: 5, minXP: 700 },
  { level: 6, minXP: 1000 },
  { level: 7, minXP: 1400 },
  { level: 8, minXP: 1900 },
  { level: 9, minXP: 2500 },
  { level: 10, minXP: 3200 },
] as const;

export const APP_NAME = 'Guitar Learning Platform for Beginners';
