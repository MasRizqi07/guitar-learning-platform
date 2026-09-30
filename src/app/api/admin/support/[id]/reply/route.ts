import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { createMessageSchema } from '@/validations/support';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { RateLimiter } from '@/lib/rate-limit';
import { SupportTicketStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to reply to support tickets');
    }

    const { id } = await params;
    const body = await req.json();
    const validated = createMessageSchema.parse(body);

    const nextStatus = body.nextStatus && Object.values(SupportTicketStatus).includes(body.nextStatus)
      ? (body.nextStatus as SupportTicketStatus)
      : undefined;

    const ip = RateLimiter.extractClientIp(req.headers);
    const message = await SupportService.addStaffReply(
      session,
      id,
      validated.body,
      nextStatus,
      {
        ip,
        userAgent: req.headers.get('user-agent'),
      }
    );

    return apiSuccess({ message }, 201);
  } catch (error) {
    return apiError(error);
  }
}
