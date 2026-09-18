import { QUIZ_PASSING_SCORE } from '@/config/constants';

export function calculateQuizScore(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  if (correctAnswers < 0) return 0;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  return Math.min(100, Math.max(0, score));
}

export function isQuizPassed(score: number, passingScore = QUIZ_PASSING_SCORE): boolean {
  return score >= passingScore;
}
