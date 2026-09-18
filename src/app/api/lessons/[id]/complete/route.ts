import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { LessonCompletionService } from '@/services/lesson-completion.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: lessonId } = await context.params;

    const result = await LessonCompletionService.completeLesson(user.id, lessonId);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
