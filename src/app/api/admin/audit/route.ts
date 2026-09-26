import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminAuditService } from '@/services/admin-audit.service';
import { requirePermission } from '@/lib/permissions';
import { adminAuditQuerySchema } from '@/validations/admin';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    requirePermission(actor, 'audit.read');

    const { searchParams } = new URL(req.url);
    const query = adminAuditQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      actorUserId: searchParams.get('actorUserId') || undefined,
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    });

    const result = await AdminAuditService.getAuditLogs(query);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
