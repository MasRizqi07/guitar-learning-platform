import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { apiSuccess, apiError } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;

    const result = await AdminContentService.submitLessonForReview(
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
