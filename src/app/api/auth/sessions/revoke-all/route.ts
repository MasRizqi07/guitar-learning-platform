import { requireAuthUser, revokeAllUserSessions, clearSessionCookie } from '@/lib/auth';
import { SecurityEventService } from '@/services/security-event.service';
import { SecurityEventType } from '@prisma/client';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST() {
  try {
    const user = await requireAuthUser();
    const count = await revokeAllUserSessions(user.id);
    await clearSessionCookie();

    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.SESSIONS_REVOKED_ALL,
      metadata: { revokedCount: count },
    });

    return apiSuccess({
      message: `Revoked all ${count} active session(s) and logged out`,
      revokedCount: count,
    });
  } catch (error) {
    return apiError(error);
  }
}
