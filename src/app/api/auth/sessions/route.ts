import { requireAuthUser, listUserSessions } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const sessions = await listUserSessions(user.id, user.sessionId);
    return apiSuccess({ sessions });
  } catch (error) {
    return apiError(error);
  }
}
