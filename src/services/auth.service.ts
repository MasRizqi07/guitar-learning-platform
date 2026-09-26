import { UserRepository } from '@/repositories/user.repository';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  generateSecureToken,
  SessionUser,
  extractClientMetadata,
  UserRoleType,
} from '@/lib/auth';

import { AppError } from '@/lib/errors';
import { EmailService } from '@/services/email.service';
import { SecurityEventService } from '@/services/security-event.service';
import {
  RegisterInput,
  LoginInput,
  PasswordResetConfirmInput,
} from '@/validations/auth';
import { AccountStatus, SecurityEventType } from '@prisma/client';

export class AuthService {
  /**
   * Registers a new learner account with default LEARNER role and ACTIVE status
   */
  static async register(input: RegisterInput, headers?: Headers): Promise<SessionUser> {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.validation('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const created = await UserRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    const clientMeta = extractClientMetadata(headers);

    // Generate initial email verification token
    try {
      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash,
          expiresAt,
        },
      });

      // Send verification email asynchronously
      EmailService.sendVerificationEmail(created.email, rawToken, created.name).catch((err) => {
        console.error('[AuthService] Failed to send verification email:', err);
      });

      await SecurityEventService.recordEvent({
        userId: created.id,
        type: SecurityEventType.EMAIL_VERIFICATION_SENT,
        userAgent: clientMeta.userAgent,
      });
    } catch (err) {
      console.error('[AuthService] Error creating verification token on register:', err);
    }

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role as UserRoleType,
      status: created.status,
    };
  }

  /**
   * Authenticates user, enforcing active account status and recording security events
   */
  static async login(input: LoginInput, headers?: Headers): Promise<SessionUser> {
    const clientMeta = extractClientMetadata(headers);
    const user = await UserRepository.findByEmail(input.email);

    if (!user || !user.passwordHash) {
      await SecurityEventService.recordEvent({
        userId: user?.id ?? null,
        type: SecurityEventType.LOGIN_FAILED,
        userAgent: clientMeta.userAgent,
        metadata: { reason: 'User not found or no password' },
      });
      throw AppError.unauthorized('Invalid email or password.');
    }

    // Check account status
    if (user.status === AccountStatus.SUSPENDED) {
      await SecurityEventService.recordEvent({
        userId: user.id,
        type: SecurityEventType.LOGIN_FAILED,
        userAgent: clientMeta.userAgent,
        metadata: { reason: 'Account suspended' },
      });
      throw AppError.forbidden('Your account has been suspended. Please contact support.');
    }

    if (user.status === AccountStatus.BANNED) {
      await SecurityEventService.recordEvent({
        userId: user.id,
        type: SecurityEventType.LOGIN_FAILED,
        userAgent: clientMeta.userAgent,
        metadata: { reason: 'Account banned' },
      });
      throw AppError.forbidden('Your account has been permanently banned.');
    }

    if (user.status === AccountStatus.DELETED) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      await SecurityEventService.recordEvent({
        userId: user.id,
        type: SecurityEventType.LOGIN_FAILED,
        userAgent: clientMeta.userAgent,
        metadata: { reason: 'Incorrect password' },
      });
      throw AppError.unauthorized('Invalid email or password.');
    }

    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.LOGIN_SUCCESS,
      userAgent: clientMeta.userAgent,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRoleType,
      status: user.status,
    };
  }

  /**
   * Initiates sending an email verification token with a 60-second cooldown
   */
  static async sendVerificationEmail(userIdOrEmail: string, headers?: Headers): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrEmail },
          { email: userIdOrEmail.toLowerCase() },
        ],
      },
    });

    if (!user) {
      // Do not reveal email non-existence to avoid enumeration
      return { success: true, message: 'If the account exists and is unverified, an email has been sent.' };
    }

    if (user.emailVerified) {
      return { success: true, message: 'This email is already verified.' };
    }

    // Check 60-second cooldown
    const latestToken = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestToken) {
      const secondsSinceLast = (Date.now() - latestToken.createdAt.getTime()) / 1000;
      if (secondsSinceLast < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLast);
        throw AppError.badRequest(`Please wait ${waitSeconds} seconds before requesting another verification email.`);
      }
    }

    // Invalidate previous unconsumed tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await EmailService.sendVerificationEmail(user.email, rawToken, user.name);

    const clientMeta = extractClientMetadata(headers);
    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.EMAIL_VERIFICATION_SENT,
      userAgent: clientMeta.userAgent,
    });

    return { success: true, message: 'Verification email sent successfully.' };
  }

  /**
   * Confirms email address using single-use cryptographic token
   */
  static async confirmEmailVerification(token: string, headers?: Headers): Promise<{ success: boolean; message: string }> {
    const tokenHash = hashToken(token);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.consumedAt !== null || record.expiresAt <= new Date()) {
      throw AppError.badRequest('Invalid, expired, or already used verification link.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      });
    });

    const clientMeta = extractClientMetadata(headers);
    await SecurityEventService.recordEvent({
      userId: record.userId,
      type: SecurityEventType.EMAIL_VERIFIED,
      userAgent: clientMeta.userAgent,
    });

    return { success: true, message: 'Email verified successfully.' };
  }

  /**
   * Requests password reset link (always returns generic message)
   */
  static async requestPasswordReset(email: string, headers?: Headers): Promise<{ success: boolean; message: string }> {
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
    };

    const user = await UserRepository.findByEmail(email);
    if (!user || user.status !== AccountStatus.ACTIVE) {
      return genericResponse;
    }

    // Cooldown check: 60 seconds
    const latestToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestToken) {
      const secondsSinceLast = (Date.now() - latestToken.createdAt.getTime()) / 1000;
      if (secondsSinceLast < 60) {
        // Return generic response without throwing to avoid timing leak
        return genericResponse;
      }
    }

    // Invalidate previous reset tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await EmailService.sendPasswordResetEmail(user.email, rawToken, user.name);

    const clientMeta = extractClientMetadata(headers);
    await SecurityEventService.recordEvent({
      userId: user.id,
      type: SecurityEventType.PASSWORD_RESET_REQUESTED,
      userAgent: clientMeta.userAgent,
    });

    return genericResponse;
  }

  /**
   * Confirms password reset, updates password hash, and REVOKES ALL SESSIONS
   */
  static async confirmPasswordReset(
    input: PasswordResetConfirmInput,
    headers?: Headers
  ): Promise<{ success: boolean; message: string }> {
    const tokenHash = hashToken(input.token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.consumedAt !== null || record.expiresAt <= new Date()) {
      throw AppError.badRequest('Invalid or expired password reset link.');
    }

    const newPasswordHash = await hashPassword(input.password);

    await prisma.$transaction(async (tx) => {
      // 1. Mark token consumed
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });

      // 2. Update password hash
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      });

      // 3. Revoke all active sessions for this user
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    const clientMeta = extractClientMetadata(headers);

    // Record security events
    await SecurityEventService.recordEvent({
      userId: record.userId,
      type: SecurityEventType.PASSWORD_RESET_COMPLETED,
      userAgent: clientMeta.userAgent,
    });
    await SecurityEventService.recordEvent({
      userId: record.userId,
      type: SecurityEventType.PASSWORD_CHANGED,
      userAgent: clientMeta.userAgent,
    });
    await SecurityEventService.recordEvent({
      userId: record.userId,
      type: SecurityEventType.SESSIONS_REVOKED_ALL,
      userAgent: clientMeta.userAgent,
      metadata: { reason: 'Password reset' },
    });

    // Notify user of security-critical password change
    EmailService.sendSecurityAlert(
      record.user.email,
      'Password Reset Completed',
      'The password for your Guitar Learning Platform account was successfully changed. All existing sessions were revoked.'
    ).catch(() => null);

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Retrieves current authenticated user state
   */
  static async getCurrentUser(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: Boolean(user.emailVerified),
      profile: user.profile,
      onboardingCompleted: Boolean(user.onboardingProfile?.completed),
      onboarding: user.onboardingProfile,
    };
  }
}
