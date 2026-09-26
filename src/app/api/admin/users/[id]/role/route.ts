import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';
import { changeRoleSchema } from '@/validations/admin';
import { RateLimiter } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;

    const body = await req.json();
    const validated = changeRoleSchema.parse(body);

    const clientMeta = {
      ip: RateLimiter.extractClientIp(req.headers),
      userAgent: req.headers.get('user-agent') || undefined,
    };

    const user = await AdminUserService.changeUserRole(id, validated.role, actor, clientMeta);

    return apiSuccess({
      message: `User role successfully updated to ${user.role}`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
