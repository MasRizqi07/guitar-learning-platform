import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const actor = await requireAuthUser();
    const overview = await AdminUserService.getOverview(actor);
    return apiSuccess(overview);
  } catch (error) {
    return apiError(error);
  }
}
