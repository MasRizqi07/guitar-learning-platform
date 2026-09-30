import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { createInternalNoteSchema } from '@/validations/support';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { RateLimiter } from '@/lib/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to create internal notes');
    }

    const { id } = await params;
    const body = await req.json();
    const validated = createInternalNoteSchema.parse(body);

    const ip = RateLimiter.extractClientIp(req.headers);
    const note = await SupportService.addStaffInternalNote(session, id, validated.body, {
      ip,
      userAgent: req.headers.get('user-agent'),
    });

    return apiSuccess({ note }, 201);
  } catch (error) {
    return apiError(error);
  }
}
