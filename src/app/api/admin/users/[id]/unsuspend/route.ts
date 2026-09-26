import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';
import { RateLimiter } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;

    const clientMeta = {
      ip: RateLimiter.extractClientIp(req.headers),
      userAgent: req.headers.get('user-agent') || undefined,
    };

    const user = await AdminUserService.unsuspendUser(id, actor, clientMeta);

    return apiSuccess({
      message: 'Account unsuspended successfully.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
