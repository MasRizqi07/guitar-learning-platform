import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { requirePermission } from '@/lib/permissions';
import { AdminAuditService, MEDIA_AUDIT_ACTIONS } from '@/services/admin-audit.service';
import { StorageProvider } from './storage-provider';
import { MockStorageProvider } from './providers/mock-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import {
  ALLOWED_MIME_TYPES,
  InitMediaUploadInput,
  CompleteMediaUploadInput,
  UpdateMediaMetadataInput,
  ListMediaQueryInput,
} from '@/validations/media';
import { MediaStatus, MediaType, Prisma } from '@prisma/client';
import crypto from 'crypto';

interface AuthActor {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export class StorageService {
  private static providerInstance: StorageProvider | null = null;

  public static getProvider(): StorageProvider {
    if (this.providerInstance) {
      return this.providerInstance;
    }

    const providerName = (process.env.STORAGE_PROVIDER || 'mock').toLowerCase();

    if (providerName === 's3' || providerName === 'r2') {
      const bucket = process.env.STORAGE_BUCKET;
      const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
      const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

      if (!bucket || !accessKeyId || !secretAccessKey) {
        if (process.env.NODE_ENV === 'production') {
          throw new AppError(
            'MEDIA_STORAGE_UNAVAILABLE',
            'Production S3/R2 storage credentials missing from environment',
            500
          );
        }
        // Fallback to mock in dev/test if secrets not provided
        this.providerInstance = new MockStorageProvider();
        return this.providerInstance;
      }

      this.providerInstance = new S3StorageProvider({
        bucket,
        endpoint: process.env.STORAGE_ENDPOINT,
        region: process.env.STORAGE_REGION || 'auto',
        accessKeyId,
        secretAccessKey,
        publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
      });
      return this.providerInstance;
    }

    this.providerInstance = new MockStorageProvider();
    return this.providerInstance;
  }

  public static setProviderForTesting(provider: StorageProvider | null) {
    this.providerInstance = provider;
  }

  /**
   * Generates a deterministic, collision-safe storage key
   * Format: media/{yyyy}/{mm}/{uuid}.{ext}
   */
  public static generateStorageKey(originalName: string, mimeType: string): { storageKey: string; extension: string } {
    const meta = ALLOWED_MIME_TYPES[mimeType];
    const extension = meta?.extension || 'bin';
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const uuid = crypto.randomUUID();

    return {
      storageKey: `media/${year}/${month}/${uuid}.${extension}`,
      extension,
    };
  }

  /**
   * Validates MIME type and size boundaries
   */
  public static validateFile(mimeType: string, sizeBytes: number): { type: MediaType; extension: string } {
    const normalizedMime = mimeType.trim().toLowerCase();
    const config = ALLOWED_MIME_TYPES[normalizedMime];

    if (!config) {
      throw new AppError(
        'MEDIA_TYPE_NOT_ALLOWED',
        `MIME type "${mimeType}" is not permitted. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
        400
      );
    }

    if (sizeBytes > config.maxBytes) {
      const maxMb = (config.maxBytes / (1024 * 1024)).toFixed(0);
      throw new AppError(
        'MEDIA_TOO_LARGE',
        `File size exceeds limit for ${config.type} (${maxMb} MB maximum)`,
        400
      );
    }

    return {
      type: config.type,
      extension: config.extension,
    };
  }

  /**
   * Step 1: Initiates media upload authorization and persists UPLOADING MediaAsset
   */
  public static initUpload(actor: AuthActor, input: InitMediaUploadInput) {
    return this._initUpload(actor, input);
  }

  public static initiateUpload(actor: AuthActor, input: InitMediaUploadInput) {
    return this._initUpload(actor, input);
  }

  private static async _initUpload(actor: AuthActor, input: InitMediaUploadInput) {
    requirePermission(actor, 'media.create');

    const { type, extension } = this.validateFile(input.mimeType, input.sizeBytes);
    const { storageKey } = this.generateStorageKey(input.filename, input.mimeType);
    const provider = this.getProvider();

    const uploadTarget = await provider.createUploadTarget(storageKey, input.mimeType, input.sizeBytes);
    const publicUrl = provider.getPublicUrl(storageKey);

    const asset = await prisma.mediaAsset.create({
      data: {
        type,
        status: MediaStatus.UPLOADING,
        provider: provider.name,
        bucket: process.env.STORAGE_BUCKET || 'local-bucket',
        storageKey,
        publicUrl,
        originalName: input.filename.replace(/[^\w.-]/g, '_'),
        mimeType: input.mimeType,
        extension,
        sizeBytes: BigInt(input.sizeBytes),
        checksumSha256: input.checksumSha256 || null,
        altText: input.altText || null,
        caption: input.caption || null,
        createdById: actor.id,
      },
    });

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: MEDIA_AUDIT_ACTIONS.MEDIA_UPLOAD_INITIATED,
      entityType: 'MediaAsset',
      entityId: asset.id,
      after: {
        id: asset.id,
        storageKey,
        mimeType: asset.mimeType,
        sizeBytes: Number(asset.sizeBytes),
      },
    });

    return {
      asset: {
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
      },
      uploadTarget,
    };
  }

  /**
   * Step 2: Confirms upload completion, verifies storage presence, and activates asset
   */
  public static async completeUpload(actor: AuthActor, input: CompleteMediaUploadInput) {
    requirePermission(actor, 'media.create');

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: input.assetId },
    });

    if (!asset) {
      throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
    }

    if (asset.status === MediaStatus.ACTIVE) {
      // Idempotent retry: return active asset directly
      return {
        ...asset,
        sizeBytes: Number(asset.sizeBytes),
      };
    }

    if (asset.status !== MediaStatus.UPLOADING) {
      throw new AppError(
        'MEDIA_NOT_ACTIVE',
        `Asset cannot be completed from status: ${asset.status}`,
        400
      );
    }

    const provider = this.getProvider();
    const exists = await provider.objectExists(asset.storageKey);

    if (!exists) {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { status: MediaStatus.FAILED },
      });
      throw new AppError(
        'MEDIA_UPLOAD_FAILED',
        'Storage object verification failed: object does not exist in storage provider',
        400
      );
    }

    const activated = await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        status: MediaStatus.ACTIVE,
        width: input.width || asset.width,
        height: input.height || asset.height,
        durationMs: input.durationMs || asset.durationMs,
      },
    });

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: MEDIA_AUDIT_ACTIONS.MEDIA_UPLOAD_COMPLETED,
      entityType: 'MediaAsset',
      entityId: activated.id,
      after: {
        id: activated.id,
        status: activated.status,
        storageKey: activated.storageKey,
      },
    });

    return {
      ...activated,
      sizeBytes: Number(activated.sizeBytes),
    };
  }

  /**
   * Server-mediated upload for small assets / test runners
   */
  public static async uploadServerBuffer(
    actor: AuthActor,
    bufferOrInput: Buffer | { filename: string; mimeType: string; buffer: Buffer; altText?: string; caption?: string; width?: number; height?: number },
    filenameArg?: string,
    mimeTypeArg?: string,
    optionsArg?: { altText?: string; caption?: string; width?: number; height?: number }
  ) {
    requirePermission(actor, 'media.create');

    let fileBuffer: Buffer;
    let filename: string;
    let mimeType: string;
    let options: { altText?: string; caption?: string; width?: number; height?: number } | undefined;

    if (Buffer.isBuffer(bufferOrInput)) {
      fileBuffer = bufferOrInput;
      filename = filenameArg || 'file';
      mimeType = mimeTypeArg || 'application/octet-stream';
      options = optionsArg;
    } else {
      fileBuffer = bufferOrInput.buffer;
      filename = bufferOrInput.filename;
      mimeType = bufferOrInput.mimeType;
      options = bufferOrInput;
    }

    const { type, extension } = this.validateFile(mimeType, fileBuffer.length);
    const { storageKey } = this.generateStorageKey(filename, mimeType);
    const provider = this.getProvider();

    let publicUrl: string;
    if (provider.uploadBuffer) {
      publicUrl = await provider.uploadBuffer(storageKey, fileBuffer, mimeType);
    } else {
      // Fallback: create upload target and upload via PUT
      const target = await provider.createUploadTarget(storageKey, mimeType, fileBuffer.length);
      publicUrl = provider.getPublicUrl(storageKey);
      await fetch(target.uploadUrl, {
        method: target.method,
        body: new Uint8Array(fileBuffer),
        headers: { 'Content-Type': mimeType },
      });
    }

    const checksumSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const asset = await prisma.mediaAsset.create({
      data: {
        type,
        status: MediaStatus.ACTIVE,
        provider: provider.name,
        bucket: process.env.STORAGE_BUCKET || 'local-bucket',
        storageKey,
        publicUrl,
        originalName: filename.replace(/[^\w.-]/g, '_'),
        mimeType,
        extension,
        sizeBytes: BigInt(fileBuffer.length),
        checksumSha256,
        width: options?.width || null,
        height: options?.height || null,
        altText: options?.altText || null,
        caption: options?.caption || null,
        createdById: actor.id,
      },
    });

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: MEDIA_AUDIT_ACTIONS.MEDIA_UPLOAD_COMPLETED,
      entityType: 'MediaAsset',
      entityId: asset.id,
      after: {
        id: asset.id,
        storageKey,
        mimeType,
        sizeBytes: fileBuffer.length,
      },
    });

    return {
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
    };
  }

  /**
   * Lists media assets with search, filters, usage indicators, and pagination
   */
  public static async listAssets(actor: AuthActor, query: Partial<ListMediaQueryInput> = {}) {
    requirePermission(actor, 'media.read');

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const status = query.status ?? 'ALL';
    const type = query.type ?? 'ALL';

    const where: Prisma.MediaAssetWhereInput = {};

    if (status !== 'ALL') {
      where.status = status as MediaStatus;
    } else {
      where.status = { not: MediaStatus.DELETED };
    }

    if (type !== 'ALL') {
      where.type = type as MediaType;
    }

    if (query.search) {
      where.OR = [
        { originalName: { contains: query.search, mode: 'insensitive' } },
        { altText: { contains: query.search, mode: 'insensitive' } },
        { caption: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.usage === 'USED') {
      where.OR = [
        { courseThumbnails: { some: {} } },
        { lessonSections: { some: {} } },
      ];
    } else if (query.usage === 'UNUSED') {
      where.AND = [
        { courseThumbnails: { none: {} } },
        { lessonSections: { none: {} } },
      ];
    }

    const total = await prisma.mediaAsset.count({ where });

    const items = await prisma.mediaAsset.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: {
            courseThumbnails: true,
            lessonSections: true,
          },
        },
      },
    });

    const mapped = items.map((item) => ({
      ...item,
      sizeBytes: Number(item.sizeBytes),
      usageCount: item._count.courseThumbnails + item._count.lessonSections,
    }));

    return {
      items: mapped,
      data: mapped,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Retrieves single asset detail with exact usage references
   */
  public static async getAssetById(actor: AuthActor, id: string) {
    requirePermission(actor, 'media.read');

    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        courseThumbnails: {
          select: { id: true, title: true, slug: true, status: true },
        },
        lessonSections: {
          select: {
            id: true,
            title: true,
            type: true,
            order: true,
            lesson: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                module: {
                  select: {
                    id: true,
                    title: true,
                    course: {
                      select: { id: true, title: true, slug: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
    }

    return {
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
      usageCount: asset.courseThumbnails.length + asset.lessonSections.length,
    };
  }

  /**
   * Updates metadata (altText, caption, originalName)
   */
  public static async updateMetadata(actor: AuthActor, id: string, input: UpdateMediaMetadataInput) {
    requirePermission(actor, 'media.update');

    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data: {
        originalName: input.originalName || existing.originalName,
        altText: input.altText !== undefined ? input.altText : existing.altText,
        caption: input.caption !== undefined ? input.caption : existing.caption,
      },
    });

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: MEDIA_AUDIT_ACTIONS.MEDIA_UPDATED,
      entityType: 'MediaAsset',
      entityId: updated.id,
      before: {
        originalName: existing.originalName,
        altText: existing.altText,
        caption: existing.caption,
      },
      after: {
        originalName: updated.originalName,
        altText: updated.altText,
        caption: updated.caption,
      },
    });

    return {
      ...updated,
      sizeBytes: Number(updated.sizeBytes),
    };
  }

  /**
   * Archives media asset (non-destructive removal from library)
   */
  public static async archiveAsset(actor: AuthActor, id: string) {
    requirePermission(actor, 'media.archive');

    const existing = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
    }

    const archived = await prisma.mediaAsset.update({
      where: { id },
      data: {
        status: MediaStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: MEDIA_AUDIT_ACTIONS.MEDIA_ARCHIVED,
      entityType: 'MediaAsset',
      entityId: archived.id,
      before: { status: existing.status },
      after: { status: archived.status },
    });

    return {
      ...archived,
      sizeBytes: Number(archived.sizeBytes),
    };
  }

  /**
   * Safe delete: Rejects if asset is currently attached to any active Course or LessonSection
   */
  public static async deleteAsset(actor: AuthActor, id: string) {
    requirePermission(actor, 'media.delete');

    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        courseThumbnails: { select: { id: true, title: true } },
        lessonSections: {
          select: {
            id: true,
            title: true,
            lesson: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!asset) {
      throw new AppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);
    }

    const usageCount = asset.courseThumbnails.length + asset.lessonSections.length;
    if (usageCount > 0) {
      throw new AppError(
        'MEDIA_IN_USE',
        `Cannot delete media asset "${asset.originalName}" because it is currently attached to ${usageCount} content item(s). Detach or replace the asset before deleting.`,
        409,
        {
          usageCount,
          courses: asset.courseThumbnails,
          sections: asset.lessonSections.map((s) => ({
            sectionId: s.id,
            sectionTitle: s.title,
            lessonId: s.lesson.id,
            lessonTitle: s.lesson.title,
          })),
        }
      );
    }

    // Attempt object deletion in storage provider first
    const provider = this.getProvider();
    try {
      await provider.deleteObject(asset.storageKey);
    } catch (err: unknown) {
      await prisma.mediaAsset.update({
        where: { id },
        data: { status: MediaStatus.FAILED },
      });
      throw new AppError(
        'MEDIA_DELETE_FAILED',
        `Failed to remove object from storage provider: ${err instanceof Error ? err.message : String(err)}`,
        502
      );
    }

    // Mark deleted in DB with timestamp
    await prisma.mediaAsset.update({
      where: { id },
      data: {
        status: MediaStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: MEDIA_AUDIT_ACTIONS.MEDIA_DELETED,
      entityType: 'MediaAsset',
      entityId: id,
      before: {
        id: asset.id,
        storageKey: asset.storageKey,
        originalName: asset.originalName,
      },
    });

    return { success: true, deletedId: id };
  }
}
