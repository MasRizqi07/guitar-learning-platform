import { z } from 'zod';

export const featureFlagKeyRegex = /^[A-Z0-9_]{3,64}$/;

export const createFeatureFlagSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      featureFlagKeyRegex,
      'Flag key must be 3-64 characters and consist only of uppercase letters, numbers, and underscores (e.g. ADAPTIVE_LEARNING)'
    ),
  description: z.string().trim().max(300, 'Description cannot exceed 300 characters').optional().nullable(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateFeatureFlagSchema = z.object({
  description: z.string().trim().max(300).optional().nullable(),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updatePlatformSettingSchema = z.object({
  value: z.unknown(),
  description: z.string().trim().max(300).optional().nullable(),
});

export const analyticsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'custom']).default('30d'),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export const userAnalyticsExclusionSchema = z.object({
  userId: z.string().uuid(),
  analyticsExcluded: z.boolean(),
});

export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagSchema>;
export type UpdatePlatformSettingInput = z.infer<typeof updatePlatformSettingSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
export type UserAnalyticsExclusionInput = z.infer<typeof userAnalyticsExclusionSchema>;
