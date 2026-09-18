import { PRACTICE_THRESHOLDS } from '@/config/constants';

export interface PracticeValidationResult {
  isValid: boolean;
  requiredSeconds: number;
  durationSeconds: number;
  message?: string;
}

export function validatePracticeDuration(
  practiceType: string,
  durationSeconds: number
): PracticeValidationResult {
  let requiredSeconds: number = PRACTICE_THRESHOLDS.LESSON;

  switch (practiceType) {
    case 'DAILY':
      requiredSeconds = PRACTICE_THRESHOLDS.DAILY;
      break;
    case 'CHORD':
      requiredSeconds = PRACTICE_THRESHOLDS.CHORD;
      break;
    case 'CHORD_TRANSITION':
      requiredSeconds = PRACTICE_THRESHOLDS.CHORD_TRANSITION;
      break;
    case 'STRUMMING':
      requiredSeconds = PRACTICE_THRESHOLDS.STRUMMING;
      break;
    case 'LESSON':
    default:
      requiredSeconds = PRACTICE_THRESHOLDS.LESSON;
      break;
  }

  const isValid = durationSeconds >= requiredSeconds;

  return {
    isValid,
    requiredSeconds,
    durationSeconds,
    message: isValid
      ? undefined
      : `Practice duration must be at least ${requiredSeconds} seconds to count (completed ${durationSeconds}s).`,
  };
}
