import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requireOwnerRole, requirePermission } from '@/lib/permissions';
import { AdminAuditService, OWNER_AUDIT_ACTIONS } from '@/services/admin-audit.service';
import { CreateFeatureFlagInput, UpdateFeatureFlagInput } from '@/validations/owner';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

export interface AuthActor {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export interface FeatureFlagDTO {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  config: unknown;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { name: string; email: string } | null;
}

/**
 * Deterministic user bucketing via SHA-256
 * Returns a stable integer between 0 and 99
 */
export function hashToBucket(flagKey: string, userId: string): number {
  const hash = crypto.createHash('sha256').update(`${flagKey}:${userId}`).digest('hex');
  const intVal = parseInt(hash.substring(0, 8), 16);
  return intVal % 100;
}

export class FeatureFlagService {
  // In-memory cache for ultra-fast evaluations
  private static flagCache: Map<string, { flag: FeatureFlagDTO; cachedAt: number }> = new Map();
  private static CACHE_TTL_MS = 30000; // 30 seconds

  public static clearCache(): void {
    this.flagCache.clear();
  }

  /**
   * Evaluates if a given feature flag is active for a user or globally
   * Invariant: deterministic percentage rollout per user
   */
  public static async isFeatureEnabled(flagKey: string, userId?: string): Promise<boolean> {
    const flag = await this.getFlagByKey(flagKey);
    if (!flag || !flag.enabled) {
      return false;
    }

    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    if (flag.rolloutPercentage <= 0) {
      return false;
    }

    if (!userId) {
      // If no user context provided, flag is only active if rollout is 100%
      return false;
    }

    const bucket = hashToBucket(flagKey, userId);
    return bucket < flag.rolloutPercentage;
  }

  /**
   * Retrieves flag by key with caching
   */
  public static async getFlagByKey(key: string): Promise<FeatureFlagDTO | null> {
    const cached = this.flagCache.get(key);
    const now = Date.now();
    if (cached && now - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.flag;
    }

    const row = await prisma.featureFlag.findUnique({
      where: { key },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    if (!row) return null;

    const dto = this.mapToDTO(row);
    this.flagCache.set(key, { flag: dto, cachedAt: now });
    return dto;
  }

  /**
   * Evaluates all flags for a user
   */
  public static async evaluateAll(userId?: string): Promise<Record<string, boolean>> {
    const flags = await prisma.featureFlag.findMany();
    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      if (!flag.enabled) {
        result[flag.key] = false;
      } else if (flag.rolloutPercentage >= 100) {
        result[flag.key] = true;
      } else if (flag.rolloutPercentage <= 0) {
        result[flag.key] = false;
      } else if (userId) {
        result[flag.key] = hashToBucket(flag.key, userId) < flag.rolloutPercentage;
      } else {
        result[flag.key] = false;
      }
    }

    return result;
  }

  /**
   * Lists all feature flags for the Owner Console
   */
  public static async listFlags(actor: AuthActor): Promise<FeatureFlagDTO[]> {
    requirePermission(actor, 'feature_flag.read');

    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    return flags.map(this.mapToDTO);
  }

  /**
   * Creates a new feature flag
   */
  public static async createFlag(
    actor: AuthActor,
    input: CreateFeatureFlagInput,
    headers?: Headers
  ): Promise<FeatureFlagDTO> {
    requirePermission(actor, 'feature_flag.manage');

    const existing = await prisma.featureFlag.findUnique({
      where: { key: input.key },
    });
    if (existing) {
      throw new AppError('FEATURE_FLAG_KEY_EXISTS', `Feature flag key "${input.key}" already exists`, 409);
    }

    const created = await prisma.featureFlag.create({
      data: {
        key: input.key,
        description: input.description,
        enabled: input.enabled,
        rolloutPercentage: input.rolloutPercentage,
        config: input.config as Prisma.InputJsonValue | undefined,
        createdById: actor.id,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    this.clearCache();

    // Audit logging
    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: OWNER_AUDIT_ACTIONS.FEATURE_FLAG_CREATED,
      entityType: 'FeatureFlag',
      entityId: created.id,
      after: {
        key: created.key,
        enabled: created.enabled,
        rolloutPercentage: created.rolloutPercentage,
        description: created.description,
      },
      userAgent: headers?.get('user-agent'),
    });

    return this.mapToDTO(created);
  }

  /**
   * Updates an existing feature flag
   */
  public static async updateFlag(
    actor: AuthActor,
    id: string,
    input: UpdateFeatureFlagInput,
    headers?: Headers
  ): Promise<FeatureFlagDTO> {
    requirePermission(actor, 'feature_flag.manage');

    const existing = await prisma.featureFlag.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('FEATURE_FLAG_NOT_FOUND', `Feature flag with id "${id}" not found`, 404);
    }

    const data: Prisma.FeatureFlagUpdateInput = {
      updatedBy: { connect: { id: actor.id } },
    };

    if (input.description !== undefined) data.description = input.description;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.rolloutPercentage !== undefined) data.rolloutPercentage = input.rolloutPercentage;
    if (input.config !== undefined) data.config = input.config as Prisma.InputJsonValue;

    const updated = await prisma.featureFlag.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    this.clearCache();

    // Audit action
    let action: string = OWNER_AUDIT_ACTIONS.FEATURE_FLAG_UPDATED;
    if (input.enabled !== undefined && input.enabled !== existing.enabled) {
      action = input.enabled
        ? OWNER_AUDIT_ACTIONS.FEATURE_FLAG_ENABLED
        : OWNER_AUDIT_ACTIONS.FEATURE_FLAG_DISABLED;
    }

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action,
      entityType: 'FeatureFlag',
      entityId: updated.id,
      before: {
        key: existing.key,
        enabled: existing.enabled,
        rolloutPercentage: existing.rolloutPercentage,
      },
      after: {
        key: updated.key,
        enabled: updated.enabled,
        rolloutPercentage: updated.rolloutPercentage,
      },
      userAgent: headers?.get('user-agent'),
    });

    return this.mapToDTO(updated);
  }

  /**
   * Deletes a feature flag (Owner-only)
   */
  public static async deleteFlag(actor: AuthActor, id: string, headers?: Headers): Promise<void> {
    requireOwnerRole(actor);

    const existing = await prisma.featureFlag.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('FEATURE_FLAG_NOT_FOUND', `Feature flag with id "${id}" not found`, 404);
    }

    await prisma.featureFlag.delete({
      where: { id },
    });

    this.clearCache();

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: 'FEATURE_FLAG_DELETED',
      entityType: 'FeatureFlag',
      entityId: id,
      before: {
        key: existing.key,
        enabled: existing.enabled,
      },
      userAgent: headers?.get('user-agent'),
    });
  }

  private static mapToDTO(row: {
    id: string;
    key: string;
    description: string | null;
    enabled: boolean;
    rolloutPercentage: number;
    config: unknown;
    createdById: string | null;
    updatedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: { name: string; email: string } | null;
  }): FeatureFlagDTO {
    return {
      id: row.id,
      key: row.key,
      description: row.description,
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
      config: row.config,
      createdById: row.createdById,
      updatedById: row.updatedById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy || null,
    };
  }
}
