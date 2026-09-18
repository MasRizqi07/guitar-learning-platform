import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { PracticeService } from '@/services/practice.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const practiceCompleteSchema = z.object({
  practiceType: z.enum(['DAILY', 'CHORD', 'CHORD_TRANSITION', 'STRUMMING', 'LESSON']),
  durationSeconds: z.number().int().min(1),
  lessonId: z.string().optional().nullable(),
  difficultyFeedback: z.enum(['EASY', 'OKAY', 'DIFFICULT']).optional().nullable(),
  chordIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const validated = practiceCompleteSchema.parse(body);

    const result = await PracticeService.recordPracticeSession(user.id, validated);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
