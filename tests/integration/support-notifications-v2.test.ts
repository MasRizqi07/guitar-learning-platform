import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { SupportService } from '@/services/support.service';
import { NotificationService } from '@/services/notification.service';
import { SupportRepository } from '@/repositories/support.repository';
import { NotificationRepository } from '@/repositories/notification.repository';
import { EmailService } from '@/services/email.service';
import { AuthService } from '@/services/auth.service';
import { SessionUser } from '@/lib/auth';
import {
  UserRole,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
  NotificationType,
} from '@prisma/client';

describe('Phase F — Support Operations & Notification Domain Isolation Tests', () => {
  const timestamp = Date.now();
  const createdUserIds: string[] = [];
  const createdTicketIds: string[] = [];

  let learnerAId: string;
  let learnerBId: string;
  let editorId: string;
  let supportId: string;
  let adminId: string;

  let editorActor: SessionUser;
  let supportActor: SessionUser;

  beforeAll(async () => {
    // 1. Create Learner A
    const u1 = await AuthService.register({
      name: 'Support Learner A',
      email: `supp_learner_a_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    learnerAId = u1.id;
    createdUserIds.push(learnerAId);

    // 2. Create Learner B (for IDOR attack testing)
    const u2 = await AuthService.register({
      name: 'Support Learner B',
      email: `supp_learner_b_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    learnerBId = u2.id;
    createdUserIds.push(learnerBId);

    // 3. Create Content Editor (Unauthorized for support operations)
    const u3 = await AuthService.register({
      name: 'Support Editor',
      email: `supp_editor_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    editorId = u3.id;
    createdUserIds.push(editorId);
    await prisma.user.update({ where: { id: editorId }, data: { role: UserRole.CONTENT_EDITOR } });
    editorActor = { id: editorId, email: u3.email, name: u3.name, role: UserRole.CONTENT_EDITOR };

    // 4. Create Support Staff
    const u4 = await AuthService.register({
      name: 'Support Agent',
      email: `supp_agent_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    supportId = u4.id;
    createdUserIds.push(supportId);
    await prisma.user.update({ where: { id: supportId }, data: { role: UserRole.SUPPORT } });
    supportActor = { id: supportId, email: u4.email, name: u4.name, role: UserRole.SUPPORT };

    // 5. Create Admin Staff
    const u5 = await AuthService.register({
      name: 'Support Admin',
      email: `supp_admin_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    adminId = u5.id;
    createdUserIds.push(adminId);
    await prisma.user.update({ where: { id: adminId }, data: { role: UserRole.ADMIN } });
  });

  afterAll(async () => {
    // Clean up created tickets and relations
    for (const tid of createdTicketIds) {
      await prisma.supportMessage.deleteMany({ where: { ticketId: tid } }).catch(() => null);
      await prisma.supportInternalNote.deleteMany({ where: { ticketId: tid } }).catch(() => null);
      await prisma.supportTicket.delete({ where: { id: tid } }).catch(() => null);
    }
    // Clean up notifications
    for (const uid of createdUserIds) {
      await prisma.notification.deleteMany({ where: { userId: uid } }).catch(() => null);
      await prisma.user.delete({ where: { id: uid } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  describe('1. Ticket Lifecycle, Persistence & Learner Access', () => {
    let testTicketId: string;

    it('learner creates ticket and ticket is stored in PostgreSQL', async () => {
      const ticket = await SupportService.createTicket(
        learnerAId,
        {
          category: SupportCategory.AUDIO_TUNER,
          subject: 'Acoustic pitch tracking jitter at 82Hz',
          body: 'When tuning Low E string on Safari iOS, needle oscillates rapidly between Eb and E.',
          telemetry: {
            userAgent: 'Mozilla/5.0 iOS Safari',
            audioSampleRate: 44100,
            audioContextState: 'running',
          },
        },
        { ip: '127.0.0.1', userAgent: 'Mozilla/5.0 iOS Safari' }
      );

      expect(ticket).toBeDefined();
      expect(ticket.id).toBeDefined();
      expect(ticket.ticketNumber).toMatch(/^SUP-\d{4}-\d{6}$/);
      expect(ticket.status).toBe(SupportTicketStatus.OPEN);
      expect(ticket.priority).toBe(SupportTicketPriority.NORMAL);
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].body).toContain('needle oscillates rapidly');

      testTicketId = ticket.id;
      createdTicketIds.push(testTicketId);
    });

    it('learner sees own ticket with public messages', async () => {
      const ticket = await SupportService.getLearnerTicket(testTicketId, learnerAId);
      expect(ticket).toBeDefined();
      expect(ticket.id).toBe(testTicketId);
      expect(ticket.userId).toBe(learnerAId);
      expect(ticket.messages.length).toBeGreaterThanOrEqual(1);
    });

    it('IDOR Protection: User B cannot access User A ticket', async () => {
      await expect(
        SupportService.getLearnerTicket(testTicketId, learnerBId)
      ).rejects.toThrow(/You do not have permission/);
    });

    it('IDOR Protection: User B cannot reply to User A ticket', async () => {
      await expect(
        SupportService.addLearnerReply(testTicketId, learnerBId, 'Malicious injection reply')
      ).rejects.toThrow(/You do not have permission/);
    });
  });

  describe('2. Staff Queue, Role Access & Operational Workflows', () => {
    let operationalTicketId: string;

    beforeAll(async () => {
      const ticket = await SupportService.createTicket(learnerAId, {
        category: SupportCategory.CURRICULUM,
        subject: 'Speed Drill lesson completion blocked',
        body: 'Completed 60s drill at 90 BPM with 0 errors but continue button remains disabled.',
      });
      operationalTicketId = ticket.id;
      createdTicketIds.push(operationalTicketId);
    });

    it('support queue works for authorized SUPPORT role', async () => {
      const queue = await SupportService.getStaffQueue(supportActor, {
        page: 1,
        pageSize: 20,
      });

      expect(queue.tickets).toBeDefined();
      expect(queue.total).toBeGreaterThanOrEqual(1);
      expect(queue.tickets.some((t) => t.id === operationalTicketId)).toBe(true);
    });

    it('Content Editor is denied access to support staff queue', async () => {
      await expect(
        SupportService.getStaffQueue(editorActor, {})
      ).rejects.toThrow(/Access denied/);
    });

    it('support assignment works: staff can assign ticket to self and unassign', async () => {
      // Assign to self
      const assigned = await SupportService.assignTicket(
        supportActor,
        operationalTicketId,
        supportId
      );
      expect(assigned.assignedToId).toBe(supportId);

      // Verify DB persistence
      const inDb = await SupportRepository.findById(operationalTicketId);
      expect(inDb?.assignedToId).toBe(supportId);

      // Unassign
      const unassigned = await SupportService.assignTicket(
        supportActor,
        operationalTicketId,
        null
      );
      expect(unassigned.assignedToId).toBeNull();
    });

    it('authoritative priority update works for staff', async () => {
      const updated = await SupportService.updatePriority(
        supportActor,
        operationalTicketId,
        SupportTicketPriority.URGENT
      );
      expect(updated.priority).toBe(SupportTicketPriority.URGENT);

      const inDb = await SupportRepository.findById(operationalTicketId);
      expect(inDb?.priority).toBe(SupportTicketPriority.URGENT);
    });

    it('staff public reply works and records firstResponseAt correctly', async () => {
      const beforeReply = await SupportRepository.findById(operationalTicketId);
      expect(beforeReply?.firstResponseAt).toBeNull();

      const message = await SupportService.addStaffReply(
        supportActor,
        operationalTicketId,
        'Hello! We examined your drill telemetry and synced your completion record.'
      );

      expect(message).toBeDefined();
      expect(message.authorUserId).toBe(supportId);

      // Verify firstResponseAt is set
      const afterReply = await SupportRepository.findById(operationalTicketId);
      expect(afterReply?.firstResponseAt).not.toBeNull();
      const initialFirstResponseAt = afterReply?.firstResponseAt;

      // Adding a second staff reply should NOT change the firstResponseAt timestamp
      await SupportService.addStaffReply(
        supportActor,
        operationalTicketId,
        'Second follow-up note to verify everything is working smoothly.'
      );
      const afterSecondReply = await SupportRepository.findById(operationalTicketId);
      expect(afterSecondReply?.firstResponseAt?.getTime()).toBe(initialFirstResponseAt?.getTime());
    });

    it('internal note is created in separate SupportInternalNote table', async () => {
      const internalNote = await SupportService.addStaffInternalNote(
        supportActor,
        operationalTicketId,
        'STAFF ONLY CONFIDENTIAL: Verified drill bug in AudioContext 60s timer edge case.'
      );

      expect(internalNote).toBeDefined();
      expect(internalNote.id).toBeDefined();
      expect(internalNote.authorUserId).toBe(supportId);

      // Verify it exists in separate table
      const notes = await SupportRepository.getInternalNotes(operationalTicketId);
      expect(notes.some((n) => n.id === internalNote.id)).toBe(true);
    });

    it('CRITICAL INVARIANT: internal note is ABSENT from learner ticket response', async () => {
      const learnerView = await SupportService.getLearnerTicket(operationalTicketId, learnerAId);

      // 1. In learner view, messages must not include the internal note
      const internalNoteContent = 'STAFF ONLY CONFIDENTIAL';
      expect(learnerView.messages.some((m) => m.body.includes(internalNoteContent))).toBe(false);

      // 2. The internalNotes relation must be completely omitted from the learner view
      expect((learnerView as unknown as { internalNotes?: unknown }).internalNotes).toBeUndefined();
    });

    it('state machine rejects invalid transitions and enforces allowed workflow', async () => {
      // Current state is OPEN. Allowed from OPEN: IN_PROGRESS or RESOLVED.
      // Transitioning directly to CLOSED should be rejected.
      await expect(
        SupportService.transitionStatus(
          supportActor,
          operationalTicketId,
          SupportTicketStatus.CLOSED
        )
      ).rejects.toThrow(/Invalid status transition/);

      // Transition OPEN -> IN_PROGRESS
      const inProgress = await SupportService.transitionStatus(
        supportActor,
        operationalTicketId,
        SupportTicketStatus.IN_PROGRESS
      );
      expect(inProgress.status).toBe(SupportTicketStatus.IN_PROGRESS);

      // Transition IN_PROGRESS -> WAITING_USER
      const waitingUser = await SupportService.transitionStatus(
        supportActor,
        operationalTicketId,
        SupportTicketStatus.WAITING_USER
      );
      expect(waitingUser.status).toBe(SupportTicketStatus.WAITING_USER);

      // Learner reply automatically moves WAITING_USER -> IN_PROGRESS
      await SupportService.addLearnerReply(
        operationalTicketId,
        learnerAId,
        'Here is the additional detail you requested.'
      );
      const ticketAfterLearnerReply = await SupportRepository.findById(operationalTicketId);
      expect(ticketAfterLearnerReply?.status).toBe(SupportTicketStatus.IN_PROGRESS);
    });

    it('resolve works: sets resolvedAt and resolves ticket', async () => {
      const resolved = await SupportService.transitionStatus(
        supportActor,
        operationalTicketId,
        SupportTicketStatus.RESOLVED
      );
      expect(resolved.status).toBe(SupportTicketStatus.RESOLVED);
      expect(resolved.resolvedAt).not.toBeNull();
    });

    it('reopen works: transitions RESOLVED -> OPEN and clears resolvedAt', async () => {
      const reopened = await SupportService.transitionStatus(
        supportActor,
        operationalTicketId,
        SupportTicketStatus.OPEN
      );
      expect(reopened.status).toBe(SupportTicketStatus.OPEN);
      expect(reopened.resolvedAt).toBeNull();
    });
  });

  describe('3. Privileged Audit Logging & Privacy Invariants', () => {
    let auditTicketId: string;

    beforeAll(async () => {
      const ticket = await SupportService.createTicket(learnerAId, {
        category: SupportCategory.ACCOUNT_ACCESS,
        subject: 'Audit Logging Verification Ticket',
        body: 'Testing privileged staff audit entries.',
      });
      auditTicketId = ticket.id;
      createdTicketIds.push(auditTicketId);
    });

    it('privileged audit records are written to AdminAuditLog for assignment, priority, notes, resolution', async () => {
      // 1. Assign
      await SupportService.assignTicket(supportActor, auditTicketId, supportId);

      // 2. Change Priority
      await SupportService.updatePriority(supportActor, auditTicketId, SupportTicketPriority.HIGH);

      // 3. Add Internal Note
      await SupportService.addStaffInternalNote(
        supportActor,
        auditTicketId,
        'Secret operational diagnosis string for note audit test'
      );

      // 4. Resolve
      await SupportService.transitionStatus(supportActor, auditTicketId, SupportTicketStatus.RESOLVED);

      // Query audit logs
      const logs = await prisma.adminAuditLog.findMany({
        where: { entityId: auditTicketId },
        orderBy: { createdAt: 'asc' },
      });

      const actions = logs.map((l) => l.action);
      expect(actions).toContain('SUPPORT_TICKET_ASSIGNED');
      expect(actions).toContain('SUPPORT_TICKET_PRIORITY_CHANGED');
      expect(actions).toContain('SUPPORT_INTERNAL_NOTE_ADDED');
      expect(actions).toContain('SUPPORT_TICKET_RESOLVED');
    });

    it('PRIVACY INVARIANT: message/note body is NEVER copied into audit log', async () => {
      const noteAudit = await prisma.adminAuditLog.findFirst({
        where: {
          entityId: auditTicketId,
          action: 'SUPPORT_INTERNAL_NOTE_ADDED',
        },
      });

      expect(noteAudit).toBeDefined();
      const payloadStr = JSON.stringify(noteAudit?.after || {});
      expect(payloadStr).not.toContain('Secret operational diagnosis string');
      expect((noteAudit?.after as Record<string, unknown>)?.noteId).toBeDefined();
    });
  });

  describe('4. Notification Domain, Deduplication & IDOR Protection', () => {
    let notifAId: string;

    it('notification is created on support events and stored durably', async () => {
      const notif = await NotificationRepository.create({
        userId: learnerAId,
        type: NotificationType.SUPPORT,
        title: 'New Reply Received',
        message: 'Staff replied to your tuning request.',
        actionUrl: '/support/test-1',
        dedupeKey: `test-dedupe-key-1-${timestamp}`,
      });

      expect(notif).toBeDefined();
      expect(notif.userId).toBe(learnerAId);
      expect(notif.readAt).toBeNull();
      notifAId = notif.id;
    });

    it('notification deduplication key prevents duplicate notifications on retry', async () => {
      const dedupeKey = `retry-dedupe-${timestamp}`;

      const notif1 = await NotificationRepository.create({
        userId: learnerAId,
        type: NotificationType.SUPPORT,
        title: 'Test Dedupe',
        message: 'First attempt',
        dedupeKey,
      });

      const notif2 = await NotificationRepository.create({
        userId: learnerAId,
        type: NotificationType.SUPPORT,
        title: 'Test Dedupe',
        message: 'Second attempt',
        dedupeKey,
      });

      expect(notif1.id).toBe(notif2.id);

      // Verify total count with that dedupe key is exactly 1
      const count = await prisma.notification.count({
        where: { userId: learnerAId, dedupeKey },
      });
      expect(count).toBe(1);
    });

    it('IDOR Protection: User B cannot read or mark-read User A notification', async () => {
      await expect(
        NotificationService.markAsRead(notifAId, learnerBId)
      ).rejects.toThrow(/You do not have access/);
    });

    it('mark read works for the authorized owner', async () => {
      const updated = await NotificationService.markAsRead(notifAId, learnerAId);
      expect(updated).toBeDefined();
      expect(updated?.readAt).not.toBeNull();
    });

    it('mark all read works and resets unread count to 0', async () => {
      // Create 2 unread notifications for learner A
      await NotificationRepository.create({
        userId: learnerAId,
        type: NotificationType.LEARNING,
        title: 'Streak Update',
        message: 'You achieved a 5-day practice streak!',
      });
      await NotificationRepository.create({
        userId: learnerAId,
        type: NotificationType.ACHIEVEMENT,
        title: 'Badge Unlocked',
        message: 'Fret Master badge earned.',
      });

      const unreadBefore = await NotificationService.getUnreadCount(learnerAId);
      expect(unreadBefore).toBeGreaterThanOrEqual(2);

      const res = await NotificationService.markAllAsRead(learnerAId);
      expect(res.count).toBeGreaterThanOrEqual(2);

      const unreadAfter = await NotificationService.getUnreadCount(learnerAId);
      expect(unreadAfter).toBe(0);
    });
  });

  describe('5. Non-Authoritative Email Reliability', () => {
    it('email dispatch failure does not rollback ticket or support state', async () => {
      // Spy on EmailService to simulate external network or provider failure
      const emailSpy = vi
        .spyOn(EmailService, 'sendSupportTicketCreatedEmail')
        .mockRejectedValueOnce(new Error('SMTP_CONNECTION_REFUSED'));

      // Learner creates a ticket
      const ticket = await SupportService.createTicket(learnerAId, {
        category: SupportCategory.GENERAL,
        subject: 'Testing resilience against email outage',
        body: 'Even if the transactional email fails, the ticket must persist in PostgreSQL.',
      });

      expect(ticket).toBeDefined();
      expect(ticket.id).toBeDefined();
      createdTicketIds.push(ticket.id);

      // Verify ticket is persisted in PostgreSQL
      const persisted = await SupportRepository.findById(ticket.id);
      expect(persisted).toBeDefined();
      expect(persisted?.subject).toBe('Testing resilience against email outage');

      emailSpy.mockRestore();
    });
  });
});
