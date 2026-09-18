import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { CurriculumService } from '@/services/curriculum.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { slug } = await context.params;
    const lessonData = await CurriculumService.getLessonBySlug(user.id, slug);

    return apiSuccess(lessonData);
  } catch (error) {
    return apiError(error);
  }
}
