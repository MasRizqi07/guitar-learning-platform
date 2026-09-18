import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { OnboardingService } from '@/services/onboarding.service';
import { onboardingSchema } from '@/validations/onboarding';
import { apiSuccess, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuthUser();
    const status = await OnboardingService.getOnboardingStatus(user.id);
    const availableGoals = await prisma.learningGoal.findMany();

    return apiSuccess({
      ...status,
      availableGoals,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const validated = onboardingSchema.parse(body);

    const result = await OnboardingService.completeOnboarding(user.id, validated);

    return apiSuccess({
      message: 'Onboarding completed successfully',
      ...result,
    });
  } catch (error) {
    return apiError(error);
  }
}
