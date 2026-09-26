import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { UserRepository } from '@/repositories/user.repository';
import {
  createPersistentSession,
  verifySessionToken,
  revokeSession,
  revokeAllUserSessions,
  listUserSessions,
  hashToken,
} from '@/lib/auth';
import { hasPermission, requirePermission, requireRole } from '@/lib/permissions';
import { RateLimiter } from '@/lib/rate-limit';
import { AccountStatus, SecurityEventType } from '@prisma/client';

describe('Phase A — Production Account & Security Foundation', () => {
  const timestamp = Date.now();
  const testUserEmail = `phase_a_user_${timestamp}@example.com`;
  const initialPassword = 'InitialSecurePassword123!';
  const updatedPassword = 'BrandNewPassword456!';
  let userId: string;

  beforeAll(async () => {
    RateLimiter.resetStore();
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  describe('1. Role Model & Authorization Policy Engine', () => {
    it('enforces granular RBAC permissions across all product roles', () => {
      // Learner permissions
      expect(hasPermission('LEARNER', 'lesson.read')).toBe(true);
      expect(hasPermission('LEARNER', 'course.publish')).toBe(false);
      expect(hasPermission('LEARNER', 'user.suspend')).toBe(false);

      // Legacy USER maps identically to LEARNER
      expect(hasPermission('USER', 'lesson.read')).toBe(true);
      expect(hasPermission('USER', 'lesson.publish')).toBe(false);

      // Content Editor permissions
      expect(hasPermission('CONTENT_EDITOR', 'lesson.create')).toBe(true);
      expect(hasPermission('CONTENT_EDITOR', 'lesson.update')).toBe(true);
      expect(hasPermission('CONTENT_EDITOR', 'course.publish')).toBe(false);
      expect(hasPermission('CONTENT_EDITOR', 'user.suspend')).toBe(false);

      // Support permissions
      expect(hasPermission('SUPPORT', 'user.read')).toBe(true);
      expect(hasPermission('SUPPORT', 'user.suspend')).toBe(true);
      expect(hasPermission('SUPPORT', 'lesson.publish')).toBe(false);
      expect(hasPermission('SUPPORT', 'user.delete')).toBe(false);

      // Admin permissions
      expect(hasPermission('ADMIN', 'course.publish')).toBe(true);
      expect(hasPermission('ADMIN', 'lesson.publish')).toBe(true);
      expect(hasPermission('ADMIN', 'user.update')).toBe(true);
      expect(hasPermission('ADMIN', 'user.delete')).toBe(false);

      // Owner permissions (all privileges)
      expect(hasPermission('OWNER', 'user.delete')).toBe(true);
      expect(hasPermission('OWNER', 'role.manage')).toBe(true);
      expect(hasPermission('OWNER', 'system.manage')).toBe(true);
      expect(hasPermission('OWNER', 'feature_flag.manage')).toBe(true);
    });

    it('requirePermission allows authorized users and throws forbidden for unauthorized users', () => {
      const learner = { id: 'u1', role: 'LEARNER' };
      const admin = { id: 'u2', role: 'ADMIN' };

      expect(() => requirePermission(learner, 'lesson.read')).not.toThrow();
      expect(() => requirePermission(learner, 'course.publish')).toThrow(/Access denied/);
      expect(() => requirePermission(admin, 'course.publish')).not.toThrow();
    });

    it('requireRole verifies role membership strictly', () => {
      const editor = { id: 'u3', role: 'CONTENT_EDITOR' };

      expect(() => requireRole(editor, ['CONTENT_EDITOR', 'ADMIN'])).not.toThrow();
      expect(() => requireRole(editor, ['ADMIN', 'OWNER'])).toThrow(/Access denied/);
    });
  });

  describe('2. Registration, Account Status & Email Verification', () => {
    it('registers user with LEARNER role, ACTIVE status, and creates hashed verification token', async () => {
      const registered = await AuthService.register({
        name: 'Phase A Tester',
        email: testUserEmail,
        password: initialPassword,
      });

      expect(registered.id).toBeDefined();
      expect(registered.role).toBe('LEARNER');
      expect(registered.status).toBe(AccountStatus.ACTIVE);
      userId = registered.id;

      // Verify DB record
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(dbUser?.role).toBe('LEARNER');
      expect(dbUser?.status).toBe(AccountStatus.ACTIVE);
      expect(dbUser?.emailVerified).toBeNull();

      // Verify token in DB is hashed
      const tokenRecord = await prisma.emailVerificationToken.findFirst({
        where: { userId },
      });
      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord?.tokenHash).toBeDefined();
      expect(tokenRecord?.consumedAt).toBeNull();
    });

    it('rejects verification with an invalid token', async () => {
      await expect(
        AuthService.confirmEmailVerification('invalid-nonexistent-token-xyz')
      ).rejects.toThrow();
    });

    it('enforces 60-second cooldown on resending verification email', async () => {
      await expect(
        AuthService.sendVerificationEmail(testUserEmail)
      ).rejects.toThrow(/Please wait/);
    });

    it('confirms email verification with valid token and consumes token', async () => {
      // Find the token hash in DB and test verification flow
      // We'll create a known test token for deterministic testing
      const testRawToken = 'test-raw-verification-token-1234567890';
      const testTokenHash = hashToken(testRawToken);

      await prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: testTokenHash,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });

      const result = await AuthService.confirmEmailVerification(testRawToken);
      expect(result.success).toBe(true);

      // Verify user in DB is now verified
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      expect(dbUser?.emailVerified).not.toBeNull();

      // Verify token is consumed and cannot be reused
      const tokenRow = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash: testTokenHash },
      });
      expect(tokenRow?.consumedAt).not.toBeNull();

      await expect(
        AuthService.confirmEmailVerification(testRawToken)
      ).rejects.toThrow();
    });
  });

  describe('3. Persistent Sessions, Token Hashing & Per-Device Revocation', () => {
    let sessionToken1: string;
    let sessionId1: string;
    let sessionToken2: string;
    let sessionId2: string;
    let sessionToken3: string;
    let sessionId3: string;

    it('creates multiple persistent sessions with SHA-256 hashed storage', async () => {
      const mockHeaders1 = new Headers({ 'user-agent': 'Chrome on Windows 11', 'x-forwarded-for': '192.168.1.1' });
      const mockHeaders2 = new Headers({ 'user-agent': 'Safari on iPhone 15', 'x-forwarded-for': '192.168.1.2' });
      const mockHeaders3 = new Headers({ 'user-agent': 'Firefox on Linux', 'x-forwarded-for': '192.168.1.3' });

      const s1 = await createPersistentSession(userId, mockHeaders1);
      const s2 = await createPersistentSession(userId, mockHeaders2);
      const s3 = await createPersistentSession(userId, mockHeaders3);

      sessionToken1 = s1.token;
      sessionId1 = s1.sessionId;
      sessionToken2 = s2.token;
      sessionId2 = s2.sessionId;
      sessionToken3 = s3.token;
      sessionId3 = s3.sessionId;

      // Verify tokens are stored as hashes in PostgreSQL, NOT raw tokens
      const row1 = await prisma.session.findUnique({ where: { id: sessionId1 } });
      expect(row1?.tokenHash).toBe(hashToken(sessionToken1));
      expect(row1?.tokenHash).not.toBe(sessionToken1);
      expect(row1?.userAgent).toContain('Chrome');
      expect(row1?.revokedAt).toBeNull();

      // Verify session tokens authenticate successfully
      const user1 = await verifySessionToken(sessionToken1);
      expect(user1).not.toBeNull();
      expect(user1?.id).toBe(userId);
      expect(user1?.sessionId).toBe(sessionId1);

      const user2 = await verifySessionToken(sessionToken2);
      expect(user2).not.toBeNull();
      expect(user2?.sessionId).toBe(sessionId2);
      expect(sessionId3).toBeDefined();
    });

    it('lists all active sessions and marks current session correctly', async () => {
      const sessions = await listUserSessions(userId, sessionId2);
      expect(sessions.length).toBeGreaterThanOrEqual(3);

      const current = sessions.find((s) => s.id === sessionId2);
      expect(current?.isCurrent).toBe(true);

      const other = sessions.find((s) => s.id === sessionId1);
      expect(other?.isCurrent).toBe(false);
    });

    it('revokes a single session and immediately rejects subsequent requests from that device', async () => {
      const revoked = await revokeSession(sessionId1, userId);
      expect(revoked).toBe(true);

      // Session 1 must fail immediately
      const verified1 = await verifySessionToken(sessionToken1);
      expect(verified1).toBeNull();

      // Session 2 and 3 must remain valid
      const verified2 = await verifySessionToken(sessionToken2);
      expect(verified2).not.toBeNull();
      const verified3 = await verifySessionToken(sessionToken3);
      expect(verified3).not.toBeNull();
    });

    it('revokes all other sessions while preserving current session', async () => {
      const revokedCount = await revokeAllUserSessions(userId, sessionId2);
      expect(revokedCount).toBeGreaterThanOrEqual(1);

      // Session 3 was revoked
      const verified3 = await verifySessionToken(sessionToken3);
      expect(verified3).toBeNull();

      // Session 2 remains valid
      const verified2 = await verifySessionToken(sessionToken2);
      expect(verified2).not.toBeNull();
    });
  });

  describe('4. Password Recovery & Global Session Revocation', () => {
    it('returns generic response for password reset requests without leaking email existence', async () => {
      const realResult = await AuthService.requestPasswordReset(testUserEmail);
      expect(realResult.success).toBe(true);
      expect(realResult.message).toContain('If an account with that email exists');

      const fakeResult = await AuthService.requestPasswordReset('nonexistent_email_12345@example.com');
      expect(fakeResult.success).toBe(true);
      expect(fakeResult.message).toContain('If an account with that email exists');
    });

    it('resets password with valid token and revokes all active sessions', async () => {
      // Create a known reset token
      const rawResetToken = 'test-raw-password-reset-token-9876543210';
      const tokenHash = hashToken(rawResetToken);

      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });

      // Create an active session to verify revocation
      const activeSession = await createPersistentSession(userId);
      const activeVerified = await verifySessionToken(activeSession.token);
      expect(activeVerified).not.toBeNull();

      // Confirm reset with new password
      const resetResult = await AuthService.confirmPasswordReset({
        token: rawResetToken,
        password: updatedPassword,
      });
      expect(resetResult.success).toBe(true);

      // Verify that previously active session is now revoked immediately
      const postResetVerified = await verifySessionToken(activeSession.token);
      expect(postResetVerified).toBeNull();

      // Verify user can log in with new password
      const loginNew = await AuthService.login({
        email: testUserEmail,
        password: updatedPassword,
      });
      expect(loginNew.id).toBe(userId);

      // Old password must fail
      await expect(
        AuthService.login({
          email: testUserEmail,
          password: initialPassword,
        })
      ).rejects.toThrow();
    });
  });

  describe('5. Account Status & Administrative Suspension', () => {
    it('suspends an account and revokes active sessions and prevents login', async () => {
      // Create active session
      const testSession = await createPersistentSession(userId);
      expect(await verifySessionToken(testSession.token)).not.toBeNull();

      // Suspend user
      await UserRepository.suspendUser(userId, 'Abusive behavior detected');

      // 1. Session verification must fail immediately
      const verifiedAfterSuspension = await verifySessionToken(testSession.token);
      expect(verifiedAfterSuspension).toBeNull();

      // 2. Login attempt must fail with forbidden suspension error
      await expect(
        AuthService.login({
          email: testUserEmail,
          password: updatedPassword,
        })
      ).rejects.toThrow(/suspended/i);

      // Unsuspend user and verify login works again
      await UserRepository.unsuspendUser(userId);
      const loginAgain = await AuthService.login({
        email: testUserEmail,
        password: updatedPassword,
      });
      expect(loginAgain.id).toBe(userId);
    });
  });

  describe('6. Distributed Rate Limiting', () => {
    it('enforces request rate limits and triggers rejection upon threshold breach', async () => {
      const testKey = `test-ip-${Date.now()}`;
      const config = { maxRequests: 3, windowSeconds: 60 };

      const r1 = await RateLimiter.check('test-action', testKey, config);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = await RateLimiter.check('test-action', testKey, config);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = await RateLimiter.check('test-action', testKey, config);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request must be rejected
      const r4 = await RateLimiter.check('test-action', testKey, config);
      expect(r4.success).toBe(false);
      expect(r4.remaining).toBe(0);
    });
  });

  describe('7. Security Events & Secret Sanitization', () => {
    it('records security events without leaking sensitive passwords or tokens', async () => {
      const events = await prisma.securityEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      expect(events.length).toBeGreaterThan(0);

      // Check event types
      const types = events.map((e) => e.type);
      expect(types).toContain(SecurityEventType.LOGIN_SUCCESS);
      expect(types).toContain(SecurityEventType.PASSWORD_RESET_COMPLETED);

      // Verify no plain tokens or passwords leaked in metadata
      for (const event of events) {
        if (event.metadata && typeof event.metadata === 'object') {
          const serialized = JSON.stringify(event.metadata).toLowerCase();
          expect(serialized).not.toContain(initialPassword.toLowerCase());
          expect(serialized).not.toContain(updatedPassword.toLowerCase());
        }
      }
    });
  });
});
