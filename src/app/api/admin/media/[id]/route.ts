import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { StorageService } from '@/services/storage/storage.service';
import { updateMediaMetadataSchema } from '@/validations/media';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await params;

    const asset = await StorageService.getAssetById(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      id
    );

    return apiSuccess(asset);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await params;
    const body = await req.json();
    const input = updateMediaMetadataSchema.parse(body);

    const updated = await StorageService.updateMetadata(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      id,
      input
    );

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthUser();
    const { id } = await params;

    const result = await StorageService.deleteAsset(
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
