import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { assignTicketSchema } from '@/validations/support';
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
      throw AppError.unauthorized('Authentication required to assign tickets');
    }

    const { id } = await params;
    const body = await req.json();
    const validated = assignTicketSchema.parse(body);

    const ip = RateLimiter.extractClientIp(req.headers);
    const updated = await SupportService.assignTicket(session, id, validated.assignedToId, {
      ip,
      userAgent: req.headers.get('user-agent'),
    });

    return apiSuccess({ ticket: updated });
  } catch (error) {
    return apiError(error);
  }
}
