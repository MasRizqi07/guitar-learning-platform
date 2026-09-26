import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { achievementUpdateSchema } from '@/validations/content';
import { apiSuccess, apiError } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;

    const result = await AdminContentService.getAchievement(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      id
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;
    const body = await req.json();
    const input = achievementUpdateSchema.parse(body);

    const result = await AdminContentService.updateAchievement(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      id,
      input
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
