import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { OwnerAnalyticsService } from '@/services/owner-analytics.service';
import { userAnalyticsExclusionSchema } from '@/validations/owner';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const body = await req.json();
    const { userId, analyticsExcluded } = userAnalyticsExclusionSchema.parse(body);

    const updatedUser = await OwnerAnalyticsService.setUserAnalyticsExcluded(
      userId,
      analyticsExcluded,
      { id: user.id, email: user.email }
    );

    return apiSuccess(updatedUser);
  } catch (error) {
    return apiError(error);
  }
}
