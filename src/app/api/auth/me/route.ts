import { getSessionUser } from '@/lib/auth';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AppError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      throw AppError.unauthorized();
    }

    const userData = await AuthService.getCurrentUser(session.id);
    return apiSuccess(userData);
  } catch (error) {
    return apiError(error);
  }
}
