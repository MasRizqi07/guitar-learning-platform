import { prisma } from '@/lib/db';
import { SecurityEventType, Prisma } from '@prisma/client';
import crypto from 'crypto';

export interface RecordSecurityEventParams {
  userId?: string | null;
  type: SecurityEventType;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export class SecurityEventService {
  /**
   * Hashes an IP address with SHA-256 for GDPR/privacy compliance
   */
  static hashIp(ip?: string | null): string | null {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip.trim()).digest('hex').slice(0, 32);
  }

  /**
   * Sanitizes metadata to strictly disallow secrets, passwords, or tokens
   */
  private static sanitizeMetadata(data?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
    if (!data) return undefined;
    const sanitized: Record<string, unknown> = {};
    const FORBIDDEN_KEYS = ['password', 'token', 'secret', 'hash', 'authorization', 'cookie', 'jwt'];

    for (const [key, value] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (FORBIDDEN_KEYS.some((forbidden) => lower.includes(forbidden))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as Prisma.InputJsonValue;
  }

  /**
   * Records an immutable security audit event
   */
  static async recordEvent(params: RecordSecurityEventParams) {
    try {
      const ipHash = this.hashIp(params.ip);
      const metadata = this.sanitizeMetadata(params.metadata);

      return await prisma.securityEvent.create({
        data: {
          userId: params.userId ?? null,
          type: params.type,
          ipHash,
          userAgent: params.userAgent?.slice(0, 256) ?? null,
          metadata: metadata ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      // Non-blocking log failure so operational traffic does not hard crash if event table write has issue
      console.error('[SecurityEventService] Failed to record security event:', error);
      return null;
    }
  }

  /**
   * Retrieves security events for a specific user
   */
  static async getUserEvents(userId: string, limit = 20) {
    return prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      select: {
        id: true,
        type: true,
        userAgent: true,
        createdAt: true,
        metadata: true,
      },
    });
  }
}
