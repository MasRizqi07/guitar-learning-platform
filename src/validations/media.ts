import { z } from 'zod';
import { MediaType } from '@prisma/client';

export const ALLOWED_MIME_TYPES: Record<string, { type: MediaType; maxBytes: number; extension: string }> = {
  // Images (Max 10 MB)
  'image/jpeg': { type: MediaType.IMAGE, maxBytes: 10 * 1024 * 1024, extension: 'jpg' },
  'image/png': { type: MediaType.IMAGE, maxBytes: 10 * 1024 * 1024, extension: 'png' },
  'image/webp': { type: MediaType.IMAGE, maxBytes: 10 * 1024 * 1024, extension: 'webp' },

  // Audio (Max 30 MB)
  'audio/mpeg': { type: MediaType.AUDIO, maxBytes: 30 * 1024 * 1024, extension: 'mp3' },
  'audio/wav': { type: MediaType.AUDIO, maxBytes: 30 * 1024 * 1024, extension: 'wav' },
  'audio/ogg': { type: MediaType.AUDIO, maxBytes: 30 * 1024 * 1024, extension: 'ogg' },

  // Video (Max 100 MB)
  'video/mp4': { type: MediaType.VIDEO, maxBytes: 100 * 1024 * 1024, extension: 'mp4' },
  'video/webm': { type: MediaType.VIDEO, maxBytes: 100 * 1024 * 1024, extension: 'webm' },

  // Documents (Max 15 MB)
  'application/pdf': { type: MediaType.DOCUMENT, maxBytes: 15 * 1024 * 1024, extension: 'pdf' },
};

export const initMediaUploadSchema = z.object({
  filename: z.string().trim().min(1, 'Filename required').max(255, 'Filename too long'),
  mimeType: z.string().trim().min(1, 'MIME type required'),
  sizeBytes: z.number().int().positive('Size must be positive'),
  checksumSha256: z
    .string()
    .length(64, 'Checksum must be 64-char SHA256')
    .regex(/^[a-f0-9]{64}$/i, 'Invalid hex checksum')
    .optional()
    .nullable(),
  altText: z.string().trim().max(300, 'Alt text max 300 chars').optional().nullable(),
  caption: z.string().trim().max(500, 'Caption max 500 chars').optional().nullable(),
});

export const completeMediaUploadSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  durationMs: z.number().int().positive().optional().nullable(),
});

export const updateMediaMetadataSchema = z.object({
  originalName: z.string().trim().min(1, 'Filename cannot be empty').max(255).optional(),
  altText: z.string().trim().max(300, 'Alt text max 300 chars').optional().nullable(),
  caption: z.string().trim().max(500, 'Caption max 500 chars').optional().nullable(),
});

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  type: z.enum(['ALL', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'OTHER']).default('ALL'),
  status: z.enum(['ALL', 'ACTIVE', 'ARCHIVED', 'UPLOADING', 'FAILED', 'DELETED']).default('ALL'),
  usage: z.enum(['ALL', 'USED', 'UNUSED']).default('ALL'),
  sortBy: z.enum(['createdAt', 'originalName', 'sizeBytes']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type InitMediaUploadInput = z.infer<typeof initMediaUploadSchema>;
export type CompleteMediaUploadInput = z.infer<typeof completeMediaUploadSchema>;
export type UpdateMediaMetadataInput = z.infer<typeof updateMediaMetadataSchema>;
export type ListMediaQueryInput = z.infer<typeof listMediaQuerySchema>;
export type ListMediaQueryRawInput = z.input<typeof listMediaQuerySchema>;
