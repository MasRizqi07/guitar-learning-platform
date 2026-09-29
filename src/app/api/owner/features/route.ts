import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { requireOwnerRole } from '@/lib/permissions';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { createFeatureFlagSchema } from '@/validations/owner';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const flags = await FeatureFlagService.listFlags(user);
    return apiSuccess(flags);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    requireOwnerRole(user);

    const body = await req.json();
    const validated = createFeatureFlagSchema.parse(body);

    const created = await FeatureFlagService.createFlag(user, validated, req.headers);
    return apiSuccess(created, 201);
  } catch (error) {
    return apiError(error);
  }
}
