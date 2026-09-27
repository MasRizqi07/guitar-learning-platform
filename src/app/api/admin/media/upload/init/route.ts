import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { StorageService } from '@/services/storage/storage.service';
import { initMediaUploadSchema } from '@/validations/media';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const body = await req.json();
    const input = initMediaUploadSchema.parse(body);

    const result = await StorageService.initUpload(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      input
    );

    return apiSuccess(result, 201);
  } catch (error) {
    return apiError(error);
  }
}
