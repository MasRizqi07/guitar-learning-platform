import { NextRequest } from 'next/server';
import { NotificationService } from '@/services/notification.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to update notification state');
    }

    const { id } = await params;
    const notification = await NotificationService.markAsRead(id, session.id);

    return apiSuccess({ notification });
  } catch (error) {
    return apiError(error);
  }
}
