import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { registerSchema } from '@/validations/auth';
import { setSessionCookie } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { RateLimiter } from '@/lib/rate-limit';
import { AppError } from '@/lib/errors';
import { PlatformSettingsService } from '@/services/platform-settings.service';
import { ProductAnalyticsService } from '@/services/product-analytics/product-analytics.service';

export async function POST(req: NextRequest) {
  try {
    const registrationEnabled = await PlatformSettingsService.isRegistrationEnabled();
    if (!registrationEnabled) {
      throw AppError.registrationDisabled('User registration is currently disabled by platform administration.');
    }

    const ip = RateLimiter.extractClientIp(req.headers);

    // Apply rate limit: 5 registrations per hour per IP
    const rateLimit = await RateLimiter.check('register', ip, {
      maxRequests: 5,
      windowSeconds: 3600,
    });

    if (!rateLimit.success) {
      throw AppError.rateLimit('Too many registrations from this IP address. Please try again later.');
    }

    const body = await req.json();
    const validated = registerSchema.parse(body);
    const user = await AuthService.register(validated, req.headers);

    await setSessionCookie(user, req.headers);

    // Non-authoritative analytics tracking
    await ProductAnalyticsService.trackUserRegistered(user.id, { role: user.role });

    return apiSuccess({ user, message: 'Account created successfully' }, 201);
  } catch (error) {
    return apiError(error);
  }
}
