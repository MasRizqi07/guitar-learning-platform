import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireOwnerRole, requirePermission } from '@/lib/permissions';
import { AdminAuditService, OWNER_AUDIT_ACTIONS } from '@/services/admin-audit.service';
import { Prisma } from '@prisma/client';

export interface AuthActor {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export interface PlatformSettingDTO {
  key: string;
  value: unknown;
  description: string | null;
  updatedById: string | null;
  updatedAt: string;
  updatedBy?: { name: string; email: string } | null;
}

export const PLATFORM_SETTING_KEYS = {
  REGISTRATION_ENABLED: 'REGISTRATION_ENABLED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
  SUPPORT_EMAIL: 'SUPPORT_EMAIL',
  DEFAULT_DAILY_GOAL: 'DEFAULT_DAILY_GOAL',
} as const;

export class PlatformSettingsService {
  private static cache: Map<string, { value: unknown; cachedAt: number }> = new Map();
  private static CACHE_TTL_MS = 30000; // 30s

  public static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Retrieves a setting value by key with safe fallback default
   */
  public static async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.value as T;
    }

    try {
      const row = await prisma.platformSetting.findUnique({
        where: { key },
      });

      if (!row || row.value === undefined || row.value === null) {
        return defaultValue;
      }

      this.cache.set(key, { value: row.value, cachedAt: now });
      return row.value as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Checks whether public learner registration is allowed
   */
  public static async isRegistrationEnabled(): Promise<boolean> {
    return this.getSetting<boolean>(PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED, true);
  }

  /**
   * Checks whether platform is in maintenance mode
   */
  public static async isMaintenanceMode(): Promise<boolean> {
    return this.getSetting<boolean>(PLATFORM_SETTING_KEYS.MAINTENANCE_MODE, false);
  }

  /**
   * Retrieves support email address
   */
  public static async getSupportEmail(): Promise<string> {
    return this.getSetting<string>(PLATFORM_SETTING_KEYS.SUPPORT_EMAIL, 'support@guitarlearning.com');
  }

  /**
   * Lists all operational platform settings for the Owner Console
   */
  public static async listSettings(actor: AuthActor): Promise<PlatformSettingDTO[]> {
    requirePermission(actor, 'system.manage');

    const rows = await prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
    });

    return rows.map((r) => ({
      key: r.key,
      value: r.value,
      description: r.description,
      updatedById: r.updatedById,
      updatedAt: r.updatedAt.toISOString(),
      updatedBy: r.updatedBy || null,
    }));
  }

  /**
   * Updates a platform setting (Owner-governed)
   */
  public static async updateSetting(
    actor: AuthActor,
    key: string,
    value: unknown,
    description?: string,
    headers?: Headers
  ): Promise<PlatformSettingDTO> {
    requireOwnerRole(actor);

    // Invariant: Never allow storing secrets in PlatformSetting
    const forbiddenPatterns = ['secret', 'password', 'token', 'database_url', 'auth_secret', 'key'];
    if (forbiddenPatterns.some((p) => key.toLowerCase().includes(p) && !['support_email', 'default_daily_goal', 'registration_enabled', 'maintenance_mode'].includes(key.toLowerCase()))) {
      throw new AppError('INVALID_PLATFORM_SETTING', 'Sensitive credentials and secret keys must not be stored in platform settings', 400);
    }

    const existing = await prisma.platformSetting.findUnique({
      where: { key },
    });

    const updated = await prisma.platformSetting.upsert({
      where: { key },
      update: {
        value: value as Prisma.InputJsonValue,
        description: description !== undefined ? description : undefined,
        updatedById: actor.id,
      },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        description: description || null,
        updatedById: actor.id,
      },
      include: {
        updatedBy: { select: { name: true, email: true } },
      },
    });

    this.clearCache();

    // Audit log
    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: OWNER_AUDIT_ACTIONS.PLATFORM_SETTING_UPDATED,
      entityType: 'PlatformSetting',
      entityId: key,
      before: existing ? { key: existing.key, value: existing.value } : null,
      after: { key: updated.key, value: updated.value },
      userAgent: headers?.get('user-agent'),
    });

    return {
      key: updated.key,
      value: updated.value,
      description: updated.description,
      updatedById: updated.updatedById,
      updatedAt: updated.updatedAt.toISOString(),
      updatedBy: updated.updatedBy || null,
    };
  }
}
