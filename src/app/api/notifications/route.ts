import { NextRequest } from 'next/server';
import { NotificationService } from '@/services/notification.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to view notifications');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await NotificationService.getUserNotifications(session.id, {
      page,
      pageSize,
      unreadOnly,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
