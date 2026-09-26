import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { getSessionUser } from '@/lib/auth';
import { emailVerificationSendSchema } from '@/validations/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { RateLimiter } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const ip = RateLimiter.extractClientIp(req.headers);
    const body = await req.json().catch(() => ({}));
    const validated = emailVerificationSendSchema.parse(body);

    const session = await getSessionUser();
    const target = validated.email || session?.email || session?.id;

    if (!target) {
      throw AppError.badRequest('Email or active session required to resend verification.');
    }

    const rateLimit = await RateLimiter.check('verification-send', `${ip}:${target}`, {
      maxRequests: 3,
      windowSeconds: 300,
    });

    if (!rateLimit.success) {
      throw AppError.rateLimit('Too many verification requests. Please wait a few minutes before trying again.');
    }

    const result = await AuthService.sendVerificationEmail(target, req.headers);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
