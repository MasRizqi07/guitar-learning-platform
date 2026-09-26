import { requireAuthUser, revokeAllUserSessions } from '@/lib/auth';
import { SecurityEventService } from '@/services/security-event.service';
import { SecurityEventType } from '@prisma/client';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST() {
  try {
    const user = await requireAuthUser();
    const count = await revokeAllUserSessions(user.id, user.sessionId);

    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.SESSIONS_REVOKED_ALL,
      metadata: { revokedCount: count, retainedSessionId: user.sessionId },
    });

    return apiSuccess({
      message: `Revoked ${count} other active session(s)`,
      revokedCount: count,
    });
  } catch (error) {
    return apiError(error);
  }
}
