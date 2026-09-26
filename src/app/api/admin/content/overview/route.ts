import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const result = await AdminContentService.getOverviewMetrics({
      id: actor.id,
      role: actor.role,
      email: actor.email,
      ip: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
