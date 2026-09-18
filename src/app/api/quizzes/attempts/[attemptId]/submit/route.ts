import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { QuizService } from '@/services/quiz.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ attemptId: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { attemptId } = await context.params;
    const body = await req.json();
    const { answers } = submitQuizSchema.parse(body);

    const result = await QuizService.submitAttempt(user.id, attemptId, answers);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
