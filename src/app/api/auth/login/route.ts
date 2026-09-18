import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { loginSchema } from '@/validations/auth';
import { setSessionCookie } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);
    const user = await AuthService.login(validated);

    await setSessionCookie(user);

    const currentUser = await AuthService.getCurrentUser(user.id);

    return apiSuccess({
      user,
      onboardingCompleted: currentUser.onboardingCompleted,
      message: 'Logged in successfully',
    });
  } catch (error) {
    return apiError(error);
  }
}
