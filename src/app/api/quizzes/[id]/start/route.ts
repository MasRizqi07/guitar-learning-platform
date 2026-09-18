import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { QuizService } from '@/services/quiz.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: quizId } = await context.params;
    const attemptData = await QuizService.startAttempt(user.id, quizId);

    return apiSuccess(attemptData);
  } catch (error) {
    return apiError(error);
  }
}
