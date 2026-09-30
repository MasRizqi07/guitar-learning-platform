import { NotificationService } from '@/services/notification.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to mark notifications as read');
    }

    const result = await NotificationService.markAllAsRead(session.id);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
