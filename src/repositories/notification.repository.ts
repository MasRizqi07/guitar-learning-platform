import { prisma } from '@/lib/db';
import {
  Notification,
  NotificationType,
  DeliveryStatus,
  DeliveryChannel,
  Prisma,
} from '@prisma/client';

export class NotificationRepository {
  /**
   * Creates a notification with deduplication key protection
   */
  static async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    dedupeKey?: string;
  }): Promise<Notification> {
    if (params.dedupeKey) {
      const existing = await prisma.notification.findUnique({
        where: {
          userId_dedupeKey: {
            userId: params.userId,
            dedupeKey: params.dedupeKey,
          },
        },
      });
      if (existing) {
        return existing;
      }
    }

    try {
      return await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
          dedupeKey: params.dedupeKey,
        },
      });
    } catch (err: unknown) {
      // Handle race condition on unique dedupeKey
      if (
        params.dedupeKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const found = await prisma.notification.findUnique({
          where: {
            userId_dedupeKey: {
              userId: params.userId,
              dedupeKey: params.dedupeKey,
            },
          },
        });
        if (found) return found;
      }
      throw err;
    }
  }

  /**
   * Find notification by ID
   */
  static async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * List notifications for a specific user with pagination and unread filter
   */
  static async listByUser(
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
      unreadOnly?: boolean;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(options.unreadOnly ? { readAt: null } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Mark a single notification as read, enforcing user ownership
   */
  static async markRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return null;
    }

    if (notification.readAt) {
      return notification;
    }

    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all unread notifications as read for a user
   */
  static async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    return result.count;
  }

  /**
   * Count unread notifications for a user
   */
  static async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  /**
   * Record a notification delivery attempt in outbox table
   */
  static async createDelivery(params: {
    notificationId?: string;
    channel?: DeliveryChannel;
    recipient: string;
    status?: DeliveryStatus;
    sentAt?: Date;
    errorReason?: string;
  }) {
    return prisma.notificationDelivery.create({
      data: {
        notificationId: params.notificationId,
        channel: params.channel || DeliveryChannel.EMAIL,
        recipient: params.recipient,
        status: params.status || DeliveryStatus.PENDING,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        sentAt: params.sentAt,
        errorReason: params.errorReason,
      },
    });
  }
}
