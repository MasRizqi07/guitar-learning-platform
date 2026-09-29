import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { AdminAuditService } from '@/services/admin-audit.service';
import { adminAuditQuerySchema } from '@/validations/admin';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const { searchParams } = new URL(req.url);
    const query = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : undefined,
      actorUserId: searchParams.get('actorUserId') || undefined,
      action: searchParams.get('action') || undefined,
      entityType: searchParams.get('entityType') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const validated = adminAuditQuerySchema.parse(query);
    const result = await AdminAuditService.getAuditLogs(validated, user);

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
