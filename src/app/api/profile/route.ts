import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { ProfileService } from '@/services/profile.service';
import { updateProfileSchema } from '@/validations/profile.schema';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const data = await ProfileService.getFullProfile(user.id);
    return apiSuccess(data);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const validated = updateProfileSchema.parse(body);

    const updated = await ProfileService.updateProfile(user.id, validated);
    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}
