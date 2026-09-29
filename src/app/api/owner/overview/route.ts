import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { OwnerAnalyticsService } from '@/services/owner-analytics.service';
import { analyticsQuerySchema } from '@/validations/owner';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const parsedQuery = analyticsQuerySchema.parse({ range, startDate, endDate });
    const overview = await OwnerAnalyticsService.getOverview(parsedQuery);

    return apiSuccess(overview);
  } catch (error) {
    return apiError(error);
  }
}
