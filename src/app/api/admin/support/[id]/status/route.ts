import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { transitionStatusSchema } from '@/validations/support';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { RateLimiter } from '@/lib/rate-limit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to transition ticket status');
    }

    const { id } = await params;
    const body = await req.json();
    const validated = transitionStatusSchema.parse(body);

    const ip = RateLimiter.extractClientIp(req.headers);
    const updated = await SupportService.transitionStatus(session, id, validated.status, {
      ip,
      userAgent: req.headers.get('user-agent'),
    });

    return apiSuccess({ ticket: updated });
  } catch (error) {
    return apiError(error);
  }
}
