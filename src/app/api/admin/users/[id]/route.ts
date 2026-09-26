import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;

    const detail = await AdminUserService.getUserDetail(id, actor);
    return apiSuccess(detail);
  } catch (error) {
    return apiError(error);
  }
}
