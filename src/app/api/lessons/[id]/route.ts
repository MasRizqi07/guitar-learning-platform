import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { CurriculumService } from '@/services/curriculum.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: lessonIdOrSlug } = await context.params;
    const lessonData = await CurriculumService.getLessonBySlug(user.id, lessonIdOrSlug);

    return apiSuccess(lessonData);
  } catch (error) {
    return apiError(error);
  }
}
