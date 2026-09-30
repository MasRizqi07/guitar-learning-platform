import { NotificationRepository } from '@/repositories/notification.repository';
import { NotificationType } from '@prisma/client';
import { AppError } from '@/lib/errors';

export class NotificationService {
  /**
   * Retrieves paginated notifications for an authenticated user
   */
  static async getUserNotifications(
    userId: string,
    options: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}
  ) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required to retrieve notifications');
    }
    return NotificationRepository.listByUser(userId, options);
  }

  /**
   * Gets unread notification count for badge rendering
   */
  static async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;
    return NotificationRepository.countUnread(userId);
  }

  /**
   * Marks a single notification as read, enforcing strict IDOR protection
   */
  static async markAsRead(notificationId: string, userId: string) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const notification = await NotificationRepository.findById(notificationId);
    if (!notification) {
      throw AppError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
    }

    // IDOR Protection: User A cannot mark User B's notification
    if (notification.userId !== userId) {
      throw AppError.forbidden('You do not have access to this notification');
    }

    return NotificationRepository.markRead(notificationId, userId);
  }

  /**
   * Marks all unread notifications as read for the user
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }
    const count = await NotificationRepository.markAllRead(userId);
    return { count };
  }

  /**
   * Dispatches a durable notification with optional deduplication key
   */
  static async dispatchNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    dedupeKey?: string;
  }) {
    return NotificationRepository.create(params);
  }
}
