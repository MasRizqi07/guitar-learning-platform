import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { lessonSectionUpdateSchema } from '@/validations/content';
import { apiSuccess, apiError } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ id: string; sectionId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuthUser();
    const { sectionId } = await context.params;
    const body = await req.json();
    const input = lessonSectionUpdateSchema.parse(body);

    const result = await AdminContentService.updateSection(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      sectionId,
      input
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuthUser();
    const { sectionId } = await context.params;

    const result = await AdminContentService.deleteSection(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      sectionId
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
