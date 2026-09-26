import { z } from 'zod';

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum(['ALL', 'LEARNER', 'CONTENT_EDITOR', 'SUPPORT', 'ADMIN', 'OWNER']).default('ALL'),
  status: z.enum(['ALL', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETION_PENDING', 'DELETED']).default('ALL'),
  verified: z.enum(['ALL', 'VERIFIED', 'UNVERIFIED']).default('ALL'),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const suspendUserSchema = z.object({
  reason: z.string().trim().min(3, 'Suspension reason must be at least 3 characters').max(500, 'Suspension reason too long'),
});

export const changeRoleSchema = z.object({
  role: z.enum(['LEARNER', 'CONTENT_EDITOR', 'SUPPORT', 'ADMIN', 'OWNER']),
});

export const adminAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  actorUserId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});

export type AdminUserQueryInput = z.infer<typeof adminUserQuerySchema>;
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
export type AdminAuditQueryInput = z.infer<typeof adminAuditQuerySchema>;
