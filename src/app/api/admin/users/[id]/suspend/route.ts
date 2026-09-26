import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminUserService } from '@/services/admin-user.service';
import { suspendUserSchema } from '@/validations/admin';
import { RateLimiter } from '@/lib/rate-limit';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;

    const body = await req.json();
    const validated = suspendUserSchema.parse(body);

    const clientMeta = {
      ip: RateLimiter.extractClientIp(req.headers),
      userAgent: req.headers.get('user-agent') || undefined,
    };

    const user = await AdminUserService.suspendUser(id, validated.reason, actor, clientMeta);

    return apiSuccess({
      message: 'Account suspended successfully. Active sessions were revoked.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
