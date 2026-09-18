import { requireAuthUser } from '@/lib/auth';
import { ProgressService } from '@/services/progress.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const progressData = await ProgressService.getProgressOverview(user.id);
    return apiSuccess(progressData);
  } catch (error) {
    return apiError(error);
  }
}
