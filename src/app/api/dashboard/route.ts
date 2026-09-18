import { requireAuthUser } from '@/lib/auth';
import { DashboardService } from '@/services/dashboard.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const dashboardData = await DashboardService.getDashboardData(user.id);
    return apiSuccess(dashboardData);
  } catch (error) {
    return apiError(error);
  }
}
