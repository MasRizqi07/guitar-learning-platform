import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { LessonCompletionService } from '@/services/lesson-completion.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { assertNotInMaintenance } from '@/lib/maintenance';
import { ProductAnalyticsService } from '@/services/product-analytics/product-analytics.service';

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    await assertNotInMaintenance(user);
    const { id: lessonId } = await context.params;

    const result = await LessonCompletionService.completeLesson(user.id, lessonId);

    // Non-authoritative analytics tracking
    await ProductAnalyticsService.trackLessonCompleted(user.id, {
      lessonId,
      xpEarned: result.xpAwarded,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
