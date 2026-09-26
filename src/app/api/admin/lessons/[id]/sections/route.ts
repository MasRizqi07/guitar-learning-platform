import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { lessonSectionCreateSchema } from '@/validations/content';
import { apiSuccess, apiError } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuthUser();
    const { id } = await context.params;
    const body = await req.json();
    const input = lessonSectionCreateSchema.parse({ ...body, lessonId: id });

    const result = await AdminContentService.createSection(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      input
    );
    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error);
  }
}
