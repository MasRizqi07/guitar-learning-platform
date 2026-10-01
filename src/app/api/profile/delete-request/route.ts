import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { requireAuthUser, verifyPassword, SESSION_COOKIE_NAME } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { DataPrivacyService } from '@/services/data-privacy.service';
import { RateLimiter } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();

    // Rate limit account deletion requests: max 3 attempts per hour per user
    const rateLimit = await RateLimiter.check('account-delete-request', user.id, {
      maxRequests: 3,
      windowSeconds: 3600,
    });
    if (!rateLimit.success) {
      throw AppError.rateLimit('Too many account deletion attempts. Please wait before retrying.');
    }

    const body = await req.json().catch(() => ({}));
    const { password, reason } = body;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });

    if (!dbUser) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found.');
    }

    // If account has password, verify it prior to deletion
    if (dbUser.passwordHash) {
      if (!password || typeof password !== 'string') {
        throw AppError.badRequest('PASSWORD_REQUIRED', 'Password confirmation is required to delete this account.');
      }

      const isValid = await verifyPassword(password, dbUser.passwordHash);
      if (!isValid) {
        throw AppError.badRequest('INVALID_CREDENTIALS', 'Incorrect password. Account deletion aborted.');
      }
    }

    const ipAddress = RateLimiter.extractClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await DataPrivacyService.requestAccountDeletion(
      user.id,
      reason,
      ipAddress,
      userAgent
    );

    // Invalidate session cookie on client
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return apiSuccess({
      status: result.status,
      deletedAt: result.deletedAt,
      message: 'Account deletion initiated. All sessions have been terminated.',
    });
  } catch (error) {
    return apiError(error);
  }
}
