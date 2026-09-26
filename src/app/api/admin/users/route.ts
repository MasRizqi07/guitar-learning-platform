import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';
import { adminUserQuerySchema } from '@/validations/admin';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthUser();

    const { searchParams } = new URL(req.url);
    const query = adminUserQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      verified: searchParams.get('verified') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    const result = await AdminUserService.listUsers(query, actor);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
