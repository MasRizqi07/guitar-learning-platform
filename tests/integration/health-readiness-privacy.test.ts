import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';
import { GET as healthGet } from '@/app/api/health/route';
import { GET as readinessGet } from '@/app/api/internal/readiness/route';
import { DataPrivacyService } from '@/services/data-privacy.service';
import {
  AccountStatus,
  SecurityEventType,
  UserRole,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
} from '@prisma/client';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

describe('Phase G — Health, Readiness, and Data Privacy Integration Tests', () => {
  const testRunId = crypto.randomUUID().slice(0, 8);
  const testUserEmail = `privacy_${testRunId}@test.fretflow.com`;
  let testUserId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Privacy Test Learner',
        email: testUserEmail,
        passwordHash: '$2a$10$abcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        role: UserRole.LEARNER,
        status: AccountStatus.ACTIVE,
      },
    });
    testUserId = user.id;

    // Create session
    await prisma.session.create({
      data: {
        userId: testUserId,
        tokenHash: crypto.randomBytes(32).toString('hex'),
        userAgent: 'Mozilla/5.0 Test Browser',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });

  afterEach(async () => {
    // Clean up
    await prisma.supportInternalNote.deleteMany({
      where: { ticket: { userId: testUserId } },
    });
    await prisma.supportMessage.deleteMany({
      where: { ticket: { userId: testUserId } },
    });
    await prisma.supportTicket.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.securityEvent.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.session.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe('1. Public Health vs Protected Readiness Probes', () => {
    it('public health probe returns shallow status: "ok" with zero infrastructure disclosure', async () => {
      const res = await healthGet();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body).toEqual({ status: 'ok' });
      expect(body.database).toBeUndefined();
      expect(body.uptime).toBeUndefined();
      expect(body.hostname).toBeUndefined();
    });

    it('protected readiness probe rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/internal/readiness');
      const res = await readinessGet(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('protected readiness probe verifies active database connectivity when presented with internal secret', async () => {
      const validSecret = process.env.INTERNAL_OPS_TOKEN || process.env.AUTH_SECRET || 'secret';
      const req = new NextRequest('http://localhost:3000/api/internal/readiness', {
        headers: {
          'x-internal-secret': validSecret,
        },
      });

      const res = await readinessGet(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ready');
      expect(body.checks.database).toBe('healthy');
      expect(body.checks.storage).toBeDefined();
      expect(body.checks.rateLimiter).toBeDefined();
    });
  });

  describe('2. GDPR Data Portability & Zero-Leakage Export', () => {
    it('exports complete user history while strictly omitting password hashes and staff internal notes', async () => {
      // Create a support ticket with public message and private internal note
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber: `TK-${testRunId}`,
          userId: testUserId,
          subject: 'Audio calibration inquiry',
          category: SupportCategory.AUDIO_TUNER,
          priority: SupportTicketPriority.NORMAL,
          status: SupportTicketStatus.OPEN,
          messages: {
            create: {
              authorUserId: testUserId,
              body: 'Tuner is reading slightly sharp on the high E string.',
            },
          },
          internalNotes: {
            create: {
              authorUserId: testUserId,
              body: 'CONFIDENTIAL STAFF NOTE: Check browser sample rate settings.',
            },
          },
        },
      });

      const exportData = await DataPrivacyService.exportUserData(testUserId);

      expect(exportData.metadata.platform).toContain('FretFlow');
      expect(exportData.user.id).toBe(testUserId);
      expect(exportData.user.email).toBe(testUserEmail);
      // Strictly verify password hash is NOT exposed
      expect((exportData.user as Record<string, unknown>).passwordHash).toBeUndefined();

      // Verify support ticket is exported
      expect(exportData.supportTickets.length).toBe(1);
      const exportedTicket = exportData.supportTickets[0];
      expect(exportedTicket.id).toBe(ticket.id);
      expect(exportedTicket.subject).toBe('Audio calibration inquiry');
      expect(exportedTicket.messages[0].body).toBe('Tuner is reading slightly sharp on the high E string.');

      // CRITICAL SECURITY INVARIANT: Zero internal note leakage
      expect((exportedTicket as Record<string, unknown>).internalNotes).toBeUndefined();
      expect(JSON.stringify(exportData)).not.toContain('CONFIDENTIAL STAFF NOTE');
    });
  });

  describe('3. Account Deletion Lifecycle & Session Revocation', () => {
    it('transitions account to DELETION_PENDING, revokes all active sessions, and logs security event', async () => {
      // Verify initial session exists
      const initialSessions = await prisma.session.count({ where: { userId: testUserId } });
      expect(initialSessions).toBe(1);

      const result = await DataPrivacyService.requestAccountDeletion(
        testUserId,
        'Moving to an acoustic-only setup',
        '192.168.1.100',
        'Vitest Test Runner'
      );

      expect(result.status).toBe(AccountStatus.DELETION_PENDING);
      expect(result.deletedAt).toBeInstanceOf(Date);

      // Verify database user record is updated
      const updatedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(updatedUser?.status).toBe(AccountStatus.DELETION_PENDING);
      expect(updatedUser?.deletedAt).toBeDefined();
      expect(updatedUser?.suspensionReason).toContain('Moving to an acoustic-only setup');

      // Verify all active sessions were atomically wiped
      const remainingSessions = await prisma.session.count({ where: { userId: testUserId } });
      expect(remainingSessions).toBe(0);

      // Verify SecurityEvent was persisted
      const securityEvent = await prisma.securityEvent.findFirst({
        where: {
          userId: testUserId,
          type: SecurityEventType.ACCOUNT_DELETION_REQUESTED,
        },
      });
      expect(securityEvent).toBeDefined();
      expect(securityEvent?.type).toBe(SecurityEventType.ACCOUNT_DELETION_REQUESTED);
    });
  });
});
