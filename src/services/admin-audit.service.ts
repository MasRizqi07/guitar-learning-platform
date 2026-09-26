import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { AdminAuditQueryInput } from '@/validations/admin';

export interface RecordAdminActionParams {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export class AdminAuditService {
  /**
   * Hashes IP address with SHA-256 for privacy compliance
   */
  static hashIp(ip?: string | null): string | null {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip.trim()).digest('hex');
  }

  /**
   * Strictly scrubs sensitive secrets, passwords, hashes, and tokens from audit payloads
   */
  static sanitizePayload(data?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
    if (!data) return undefined;
    const sanitized: Record<string, unknown> = {};
    const FORBIDDEN_KEYS = [
      'password',
      'passwordhash',
      'token',
      'tokenhash',
      'secret',
      'hash',
      'authorization',
      'cookie',
      'jwt',
    ];

    for (const [key, value] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (FORBIDDEN_KEYS.some((forbidden) => lower.includes(forbidden))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        sanitized[key] = this.sanitizePayload(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as Prisma.InputJsonValue;
  }

  /**
   * Records an immutable administrative audit log
   */
  static async recordAdminAction(params: RecordAdminActionParams) {
    try {
      const ipHash = this.hashIp(params.ip);
      const before = this.sanitizePayload(params.before);
      const after = this.sanitizePayload(params.after);

      return await prisma.adminAuditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          before: before ?? Prisma.JsonNull,
          after: after ?? Prisma.JsonNull,
          ipHash,
          userAgent: params.userAgent?.slice(0, 256) ?? null,
        },
      });
    } catch (err) {
      console.error('[AdminAuditService] Failed to record audit action:', err);
      return null;
    }
  }

  /**
   * Fetches paginated audit logs with search filters
   */
  static async getAuditLogs(query: Partial<AdminAuditQueryInput> = {}, actor?: { id: string; role: string }) {
    if (actor) {
      const { requirePermission } = await import('@/lib/permissions');
      requirePermission(actor, 'audit.read');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const skip = (page - 1) * pageSize;
    const { actorUserId, action, entityType, dateFrom, dateTo } = query;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (actorUserId) {
      where.actorUserId = actorUserId;
    }
    if (action) {
      where.action = action;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [total, items] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Retrieves audit history for a specific entity (e.g. User, Lesson)
   */
  static async getEntityAuditLogs(entityType: string, entityId: string, limit = 10) {
    return prisma.adminAuditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
