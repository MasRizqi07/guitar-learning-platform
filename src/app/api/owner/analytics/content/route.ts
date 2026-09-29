import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { OwnerAnalyticsService } from '@/services/owner-analytics.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 500) : 100;

    const result = await OwnerAnalyticsService.getContentAnalytics(limit);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
