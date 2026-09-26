import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { AdminContentService } from '@/services/admin-content.service';
import { contentQuerySchema, courseCreateSchema } from '@/validations/content';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const { searchParams } = new URL(req.url);
    const query = contentQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    const result = await AdminContentService.listCourses(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        ip: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
      query
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
    const input = courseCreateSchema.parse(body);

    const result = await AdminContentService.createCourse(
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
