import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { passwordResetRequestSchema } from '@/validations/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { RateLimiter } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const ip = RateLimiter.extractClientIp(req.headers);
    const body = await req.json();
    const validated = passwordResetRequestSchema.parse(body);

    const rateLimit = await RateLimiter.check('password-reset-request', `${ip}:${validated.email}`, {
      maxRequests: 3,
      windowSeconds: 300,
    });

    if (!rateLimit.success) {
      throw AppError.rateLimit('Too many password reset requests. Please wait a few minutes before trying again.');
    }

    const result = await AuthService.requestPasswordReset(validated.email, req.headers);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
