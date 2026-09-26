import { NextRequest } from 'next/server';
import { requireAuthUser, revokeSession } from '@/lib/auth';
import { SecurityEventService } from '@/services/security-event.service';
import { SecurityEventType } from '@prisma/client';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AppError } from '@/lib/errors';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: sessionId } = await context.params;

    if (!sessionId) {
      throw AppError.badRequest('Session ID is required');
    }

    const success = await revokeSession(sessionId, user.id);
    if (!success) {
      throw AppError.notFound('SESSION_NOT_FOUND', 'Active session not found or already revoked');
    }

    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.SESSION_REVOKED,
      metadata: { sessionId },
    });

    return apiSuccess({ message: 'Session revoked successfully' });
  } catch (error) {
    return apiError(error);
  }
}
