import { PlatformSettingsService } from '@/services/platform-settings.service';
import { AppError } from '@/lib/errors';

/**
 * Validates that platform is not in maintenance mode.
 * Platform OWNER maintains full operational bypass.
 */
export async function assertNotInMaintenance(actor?: { role?: string | null }): Promise<void> {
  const isMaintenance = await PlatformSettingsService.isMaintenanceMode();
  if (isMaintenance) {
    if (actor && actor.role?.toUpperCase() === 'OWNER') {
      return;
    }
    throw AppError.maintenanceMode(
      'The platform is currently undergoing scheduled maintenance. Learner writes and practice interactions are temporarily restricted.'
    );
  }
}
