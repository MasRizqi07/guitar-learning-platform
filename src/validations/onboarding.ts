import { z } from 'zod';
import { VALID_DAILY_GOAL_MINUTES } from '@/config/constants';

export const onboardingSchema = z.object({
  experienceLevel: z.enum(['ABSOLUTE_BEGINNER', 'BEGINNER', 'BASIC_PLAYER', 'INTERMEDIATE']),
  guitarType: z.enum(['ACOUSTIC', 'ELECTRIC', 'CLASSICAL', 'NO_GUITAR']),
  dailyGoalMinutes: z.number().refine(
    (val) => (VALID_DAILY_GOAL_MINUTES as readonly number[]).includes(val),
    { message: 'Daily goal must be 10, 15, 30, 45, or 60 minutes' }
  ),
  learningGoalCodes: z.array(z.string()).min(1, 'Please select at least one learning goal'),
  assessmentScore: z.number().min(0).max(100).optional(),
  timezone: z.string().default('Asia/Jakarta'),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
