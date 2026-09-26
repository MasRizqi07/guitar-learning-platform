import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { loginSchema } from '@/validations/auth';
import { setSessionCookie } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { RateLimiter } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const ip = RateLimiter.extractClientIp(req.headers);
    const body = await req.json();
    const validated = loginSchema.parse(body);

    // Apply rate limit: combined IP + target email (5 attempts per minute)
    const rateLimit = await RateLimiter.check('login', `${ip}:${validated.email}`, {
      maxRequests: 5,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      throw AppError.rateLimit(
        `Too many login attempts. Please try again in ${Math.max(1, rateLimit.reset - Math.floor(Date.now() / 1000))} seconds.`
      );
    }

    const user = await AuthService.login(validated, req.headers);

    await setSessionCookie(user, req.headers);

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
