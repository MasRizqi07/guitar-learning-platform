import { NextRequest } from 'next/server';
import { requireAuthUser, verifyPassword, hashPassword, revokeAllUserSessions, extractClientMetadata } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AppError } from '@/lib/errors';
import { changePasswordSchema } from '@/validations/auth';
import { SecurityEventService } from '@/services/security-event.service';
import { SecurityEventType } from '@prisma/client';
import { EmailService } from '@/services/email.service';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const validated = changePasswordSchema.parse(body);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.passwordHash) {
      throw AppError.notFound('USER_NOT_FOUND', 'User record not found.');
    }

    const isValid = await verifyPassword(validated.currentPassword, dbUser.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Current master password does not match.');
    }

    const newHash = await hashPassword(validated.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Invalidate all other sessions except current session
    let revokedCount = 0;
    if (user.sessionId) {
      revokedCount = await revokeAllUserSessions(user.id, user.sessionId);
    }

    const clientMeta = extractClientMetadata(req.headers);
    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.PASSWORD_CHANGED,
      userAgent: clientMeta.userAgent,
      metadata: { revokedCount },
    });

    EmailService.sendSecurityAlert(
      dbUser.email,
      'Password Changed',
      'The password for your FretFlow account was successfully updated. Other active device sessions have been invalidated.'
    ).catch(() => null);

    return apiSuccess({
      message: 'Master password updated successfully. Other active sessions invalidated.',
      revokedSessionsCount: revokedCount,
    });
  } catch (error) {
    return apiError(error);
  }
}
