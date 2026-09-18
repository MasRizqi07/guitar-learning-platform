import { requireAuthUser } from '@/lib/auth';
import { CurriculumService } from '@/services/curriculum.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const learningPath = await CurriculumService.getLearningPath(user.id);
    return apiSuccess(learningPath);
  } catch (error) {
    return apiError(error);
  }
}
