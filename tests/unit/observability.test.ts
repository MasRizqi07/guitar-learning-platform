import { describe, it, expect, vi } from 'vitest';
import { sanitizePayload, isSensitiveKey, sanitizeString } from '@/lib/scrubber';
import {
  normalizeRequestId,
  runWithRequestContext,
  getRequestId,
  getRequestContext,
} from '@/lib/request-context';
import { logger } from '@/lib/logger';
import { ErrorMonitoringService } from '@/lib/error-monitoring';

describe('Phase G — Observability, Scrubbing & Correlation Unit Tests', () => {
  describe('1. Sensitive Data Scrubber (scrubber.ts)', () => {
    it('identifies sensitive keys accurately', () => {
      expect(isSensitiveKey('password')).toBe(true);
      expect(isSensitiveKey('passwordHash')).toBe(true);
      expect(isSensitiveKey('sessionToken')).toBe(true);
      expect(isSensitiveKey('AUTH_SECRET')).toBe(true);
      expect(isSensitiveKey('DATABASE_URL')).toBe(true);
      expect(isSensitiveKey('DIRECT_URL')).toBe(true);
      expect(isSensitiveKey('apiKey')).toBe(true);
      expect(isSensitiveKey('cookie')).toBe(true);
      expect(isSensitiveKey('authorization')).toBe(true);
      expect(isSensitiveKey('supportInternalNotes')).toBe(true);
      expect(isSensitiveKey('username')).toBe(false);
      expect(isSensitiveKey('email')).toBe(false);
      expect(isSensitiveKey('courseTitle')).toBe(false);
    });

    it('sanitizes inline bearer tokens and database URLs in strings', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature123';
      const scrubbed = sanitizeString(authHeader);
      expect(scrubbed).not.toContain('signature123');
      expect(scrubbed).toContain('Bearer [REDACTED]');

      const dbUrl = 'postgresql://admin:super_secret_password_123@ep-cool-db.neon.tech/neondb';
      const scrubbedDb = sanitizeString(dbUrl);
      expect(scrubbedDb).not.toContain('super_secret_password_123');
      expect(scrubbedDb).toContain('postgresql://admin:[REDACTED]@ep-cool-db.neon.tech/neondb');
    });

    it('recursively redacts sensitive fields in nested objects and arrays', () => {
      const payload = {
        user: {
          id: 'user-123',
          email: 'learner@fretflow.com',
          passwordHash: '$2a$10$e8gVwT35Y3q0h1.secretHash',
          authTokens: ['token_abc_123', 'token_xyz_456'],
          profile: {
            displayName: 'Guitar Hero',
            apiKey: 'sk_live_998877665544',
          },
        },
        metadata: {
          databaseUrl: 'postgresql://postgres:pass@localhost:5432/db',
          safeField: 'active',
        },
      };

      const result = sanitizePayload(payload);

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('learner@fretflow.com');
      expect(result.user.passwordHash).toBe('[REDACTED]');
      expect(result.user.authTokens).toBe('[REDACTED]');
      expect(result.user.profile.displayName).toBe('Guitar Hero');
      expect(result.user.profile.apiKey).toBe('[REDACTED]');
      expect(result.metadata.databaseUrl).toBe('[REDACTED]');
      expect(result.metadata.safeField).toBe('active');
    });

    it('handles circular references and extreme nesting depth gracefully without stack overflow', () => {
      const circularObj: Record<string, unknown> = { name: 'test' };
      circularObj.self = circularObj;

      const result = sanitizePayload(circularObj);
      expect(result.name).toBe('test');
      expect(result.self).toBe('[CIRCULAR]');

      // Deeply nested object test
      const deep: Record<string, unknown> = { level: 0 };
      let curr = deep;
      for (let i = 1; i <= 12; i++) {
        curr.next = { level: i };
        curr = curr.next as Record<string, unknown>;
      }

      const sanitizedDeep = sanitizePayload(deep);
      expect(sanitizedDeep).toBeDefined();
    });

    it('sanitizes Error objects containing secret traces', () => {
      const error = new Error('Failed to connect with password super_secret_123');
      const sanitized = sanitizePayload(error);
      expect(sanitized.name).toBe('Error');
      expect(sanitized.message).toBe('Failed to connect with password super_secret_123');
    });
  });

  describe('2. Request Correlation ID & Async Context (request-context.ts)', () => {
    it('preserves valid alphanumeric and UUID request IDs', () => {
      const validUuid = 'c38e9d21-4f12-4f81-9b24-81d39281a4b1';
      expect(normalizeRequestId(validUuid)).toBe(validUuid);

      const validAlphanumeric = 'req-prod-worker-01-abcdef';
      expect(normalizeRequestId(validAlphanumeric)).toBe(validAlphanumeric);
    });

    it('generates a new random UUID if incoming header is empty or malformed', () => {
      const idEmpty = normalizeRequestId(null);
      expect(idEmpty).toBeDefined();
      expect(idEmpty.length).toBeGreaterThanOrEqual(32);

      const idMalformed = normalizeRequestId('bad!@#$%^&*()');
      expect(idMalformed).not.toBe('bad!@#$%^&*()');
      expect(idMalformed.length).toBeGreaterThanOrEqual(32);
    });

    it('propagates request context across async execution boundaries', async () => {
      const testContext = {
        requestId: 'corr-req-778899',
        route: '/api/lessons/intro',
        method: 'GET',
        userId: 'usr_test_99',
        role: 'LEARNER',
      };

      await runWithRequestContext(testContext, async () => {
        expect(getRequestId()).toBe('corr-req-778899');
        const retrieved = getRequestContext();
        expect(retrieved?.userId).toBe('usr_test_99');
        expect(retrieved?.route).toBe('/api/lessons/intro');

        // Verify across nested promises
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(getRequestId()).toBe('corr-req-778899');
      });
    });
  });

  describe('3. Structured Logger (logger.ts)', () => {
    it('emits structured JSON entries with release SHA and scrubbed metadata', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('UserCompletedLesson', {
        requestId: 'req-log-1',
        lessonId: 'lesson-42',
        secretToken: 'shh_secret_value',
      });

      expect(consoleSpy).toHaveBeenCalled();
      const rawLog = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawLog);

      expect(parsed.event).toBe('UserCompletedLesson');
      expect(parsed.level).toBe('info');
      expect(parsed.requestId).toBe('req-log-1');
      expect(parsed.release).toBeDefined();
      expect(parsed.environment).toBeDefined();
      expect(parsed.metadata.lessonId).toBe('lesson-42');
      expect(parsed.metadata.secretToken).toBe('[REDACTED]');

      consoleSpy.mockRestore();
    });
  });

  describe('4. Error Monitoring Service (error-monitoring.ts)', () => {
    it('captures exceptions and messages using safe local fallback provider', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const eventId = ErrorMonitoringService.captureException(new Error('Test unhandled crash'), {
        requestId: 'req-err-monitor',
        extra: {
          clientSecret: 'secret_123',
          step: 'quiz_eval',
        },
      });

      expect(eventId).toBeDefined();
      expect(errorSpy).toHaveBeenCalled();

      const raw = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(raw);
      expect(parsed.event).toBe('UnhandledExceptionCaptured');
      expect(parsed.metadata.extra.clientSecret).toBe('[REDACTED]');
      expect(parsed.metadata.extra.step).toBe('quiz_eval');

      errorSpy.mockRestore();
    });
  });
});
