import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { StorageService } from '@/services/storage/storage.service';
import { completeMediaUploadSchema } from '@/validations/media';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const body = await req.json();
    const input = completeMediaUploadSchema.parse(body);

    const result = await StorageService.completeUpload(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      input
    );

    return apiSuccess(result, 200);
  } catch (error) {
    return apiError(error);
  }
}
