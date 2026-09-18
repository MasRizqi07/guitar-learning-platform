import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { CurriculumService } from '@/services/curriculum.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { z } from 'zod';

const progressInputSchema = z.object({
  currentSectionOrder: z.number().int().min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: lessonId } = await context.params;
    const body = await req.json();
    const { currentSectionOrder } = progressInputSchema.parse(body);

    const updated = await CurriculumService.updateProgress(
      user.id,
      lessonId,
      currentSectionOrder
    );

    return apiSuccess({
      message: 'Progress updated',
      progress: updated,
    });
  } catch (error) {
    return apiError(error);
  }
}
