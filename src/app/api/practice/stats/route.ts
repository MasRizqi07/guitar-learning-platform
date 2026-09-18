import { requireAuthUser } from '@/lib/auth';
import { PracticeService } from '@/services/practice.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const stats = await PracticeService.getPracticeStats(user.id);
    return apiSuccess(stats);
  } catch (error) {
    return apiError(error);
  }
}
