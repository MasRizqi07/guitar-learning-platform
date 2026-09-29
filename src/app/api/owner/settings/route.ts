import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { PlatformSettingsService } from '@/services/platform-settings.service';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const settings = await PlatformSettingsService.listSettings(user);
    return apiSuccess(settings);
  } catch (error) {
    return apiError(error);
  }
}
