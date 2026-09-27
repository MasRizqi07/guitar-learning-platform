import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { StorageService } from '@/services/storage/storage.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await params;

    const result = await StorageService.archiveAsset(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      id
    );

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
