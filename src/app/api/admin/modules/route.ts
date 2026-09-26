import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { moduleCreateSchema } from '@/validations/content';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') || undefined;

    const result = await AdminContentService.listModules(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      courseId
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const body = await req.json();
    const input = moduleCreateSchema.parse(body);

    const result = await AdminContentService.createModule(
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
