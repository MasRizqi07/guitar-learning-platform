import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { PlatformSettingsService } from '@/services/platform-settings.service';
import { updatePlatformSettingSchema } from '@/validations/owner';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const { key } = await context.params;
    const body = await req.json();
    const validated = updatePlatformSettingSchema.parse(body);

    const updated = await PlatformSettingsService.updateSetting(
      user,
      key,
      validated.value,
      validated.description || undefined,
      req.headers
    );

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
