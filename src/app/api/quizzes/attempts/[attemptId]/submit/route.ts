import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { QuizService } from '@/services/quiz.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { assertNotInMaintenance } from '@/lib/maintenance';
import { ProductAnalyticsService } from '@/services/product-analytics/product-analytics.service';
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
    await assertNotInMaintenance(user);

    const { attemptId } = await context.params;
    const body = await req.json();
    const { answers } = submitQuizSchema.parse(body);

    const result = await QuizService.submitAttempt(user.id, attemptId, answers);

    // Track analytics safely
    await ProductAnalyticsService.trackQuizCompleted(user.id, {
      quizId: result.attempt.quizId,
      score: result.attempt.score,
      passed: result.attempt.passed,
      xpEarned: result.xpAwarded,
    }).catch(() => {});

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

