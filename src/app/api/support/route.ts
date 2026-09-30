import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { createTicketSchema } from '@/validations/support';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { RateLimiter } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';
import { SupportTicketStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to view your support tickets');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const statusParam = searchParams.get('status');
    const status = Object.values(SupportTicketStatus).includes(statusParam as SupportTicketStatus)
      ? (statusParam as SupportTicketStatus)
      : undefined;

    const result = await SupportService.listLearnerTickets(session.id, {
      page,
      pageSize,
      status,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to submit a support ticket');
    }

    const ip = RateLimiter.extractClientIp(req.headers);
    const rateLimit = await RateLimiter.check('support-create-ticket', `${ip}:${session.id}`, {
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      throw AppError.rateLimit(
        `Too many support tickets submitted. Please wait ${Math.max(
          1,
          rateLimit.reset - Math.floor(Date.now() / 1000)
        )} seconds before submitting again.`
      );
    }

    const body = await req.json();
    const validated = createTicketSchema.parse(body);

    const ticket = await SupportService.createTicket(
      session.id,
      {
        category: validated.category,
        subject: validated.subject,
        body: validated.body,
        telemetry: validated.telemetry,
      },
      {
        ip,
        userAgent: req.headers.get('user-agent'),
      }
    );

    return apiSuccess({ ticket }, 201);
  } catch (error) {
    return apiError(error);
  }
}
