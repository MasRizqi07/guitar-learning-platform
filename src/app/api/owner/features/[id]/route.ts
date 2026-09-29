import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { updateFeatureFlagSchema } from '@/validations/owner';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const { id } = await context.params;
    const body = await req.json();
    const validated = updateFeatureFlagSchema.parse(body);

    const updated = await FeatureFlagService.updateFlag(user, id, validated, req.headers);
    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const { id } = await context.params;
    await FeatureFlagService.deleteFlag(user, id, req.headers);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
