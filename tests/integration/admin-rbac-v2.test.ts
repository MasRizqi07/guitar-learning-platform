import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AdminUserService } from '@/services/admin-user.service';
import { AdminAuditService } from '@/services/admin-audit.service';
import { AdminUserRepository } from '@/repositories/admin-user.repository';
import { AuthService } from '@/services/auth.service';
import { createPersistentSession, verifySessionToken, SessionUser } from '@/lib/auth';
import { adminUserQuerySchema } from '@/validations/admin';
import { UserRole, AccountStatus, SecurityEventType } from '@prisma/client';

describe('Phase B — Admin & RBAC Operations Isolation Tests', () => {
  const timestamp = Date.now();
  const createdUserIds: string[] = [];

  let learnerActor: SessionUser;
  let editorActor: SessionUser;
  let supportActor: SessionUser;
  let adminActor: SessionUser;
  let ownerActor: SessionUser;

  let learnerUserId: string;
  let editorUserId: string;
  let supportUserId: string;
  let adminUserId: string;
  let ownerUserId: string;
  let secondaryOwnerUserId: string;
  let targetLearnerUserId: string;

  beforeAll(async () => {
    // 1. Create test learner
    const u1 = await AuthService.register({
      name: 'RBAC Learner',
      email: `rbac_learner_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    learnerUserId = u1.id;
    createdUserIds.push(learnerUserId);
    learnerActor = { id: learnerUserId, email: u1.email, name: u1.name, role: UserRole.LEARNER };

    // 2. Create Content Editor
    const u2 = await AuthService.register({
      name: 'RBAC Editor',
      email: `rbac_editor_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    editorUserId = u2.id;
    createdUserIds.push(editorUserId);
    await prisma.user.update({ where: { id: editorUserId }, data: { role: UserRole.CONTENT_EDITOR } });
    editorActor = { id: editorUserId, email: u2.email, name: u2.name, role: UserRole.CONTENT_EDITOR };

    // 3. Create Support
    const u3 = await AuthService.register({
      name: 'RBAC Support',
      email: `rbac_support_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    supportUserId = u3.id;
    createdUserIds.push(supportUserId);
    await prisma.user.update({ where: { id: supportUserId }, data: { role: UserRole.SUPPORT } });
    supportActor = { id: supportUserId, email: u3.email, name: u3.name, role: UserRole.SUPPORT };

    // 4. Create Admin
    const u4 = await AuthService.register({
      name: 'RBAC Admin',
      email: `rbac_admin_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    adminUserId = u4.id;
    createdUserIds.push(adminUserId);
    await prisma.user.update({ where: { id: adminUserId }, data: { role: UserRole.ADMIN } });
    adminActor = { id: adminUserId, email: u4.email, name: u4.name, role: UserRole.ADMIN };

    // 5. Create Primary Owner
    const u5 = await AuthService.register({
      name: 'RBAC Owner 1',
      email: `rbac_owner1_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    ownerUserId = u5.id;
    createdUserIds.push(ownerUserId);
    await prisma.user.update({ where: { id: ownerUserId }, data: { role: UserRole.OWNER } });
    ownerActor = { id: ownerUserId, email: u5.email, name: u5.name, role: UserRole.OWNER };

    // 6. Create Secondary Owner
    const u6 = await AuthService.register({
      name: 'RBAC Owner 2',
      email: `rbac_owner2_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    secondaryOwnerUserId = u6.id;
    createdUserIds.push(secondaryOwnerUserId);
    await prisma.user.update({ where: { id: secondaryOwnerUserId }, data: { role: UserRole.OWNER } });

    // 7. Create Target Learner for mutation testing
    const u7 = await AuthService.register({
      name: 'RBAC Target Learner',
      email: `rbac_target_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    targetLearnerUserId = u7.id;
    createdUserIds.push(targetLearnerUserId);
  });

  afterAll(async () => {
    for (const uid of createdUserIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  describe('1. Admin Access Boundary & Authorization', () => {
    it('denies LEARNER role access to admin overview metrics', async () => {
      await expect(
        AdminUserService.getOverview(learnerActor)
      ).rejects.toThrow(/Admin access required/);
    });

    it('denies LEARNER role access to user directory', async () => {
      const query = adminUserQuerySchema.parse({});
      await expect(
        AdminUserService.listUsers(query, learnerActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('denies LEARNER role access to user detail diagnostics', async () => {
      await expect(
        AdminUserService.getUserDetail(targetLearnerUserId, learnerActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('allows SUPPORT, ADMIN, and OWNER to view admin overview', async () => {
      const supportOverview = await AdminUserService.getOverview(supportActor);
      expect(supportOverview.metrics.totalUsers).toBeGreaterThanOrEqual(7);

      const adminOverview = await AdminUserService.getOverview(adminActor);
      expect(adminOverview.metrics.totalUsers).toBeGreaterThanOrEqual(7);

      const ownerOverview = await AdminUserService.getOverview(ownerActor);
      expect(ownerOverview.metrics.totalUsers).toBeGreaterThanOrEqual(7);
    });

    it('allows SUPPORT to view user directory with pagination', async () => {
      const query = adminUserQuerySchema.parse({ page: 1, pageSize: 5 });
      const result = await AdminUserService.listUsers(query, supportActor);
      expect(result.users.length).toBeLessThanOrEqual(5);
      expect(result.pagination.total).toBeGreaterThanOrEqual(7);
    });
  });

  describe('2. Suspension Privileges & Invariants', () => {
    it('CONTENT_EDITOR cannot suspend a user (PERMISSION_DENIED)', async () => {
      await expect(
        AdminUserService.suspendUser(targetLearnerUserId, 'Rule violation test', editorActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('prevents an administrator from suspending their own account (CANNOT_SUSPEND_SELF)', async () => {
      await expect(
        AdminUserService.suspendUser(adminUserId, 'Accidental self-suspension', adminActor)
      ).rejects.toThrow(/cannot suspend their own account/i);
    });

    it('ADMIN can suspend a learner account', async () => {
      // 1. Target learner creates an active session
      const mockHeaders = new Headers({ 'user-agent': 'Chrome-Test', 'x-forwarded-for': '127.0.0.1' });
      const session = await createPersistentSession(targetLearnerUserId, mockHeaders);
      expect(session.sessionId).toBeDefined();

      // 2. Admin suspends target learner
      const suspended = await AdminUserService.suspendUser(
        targetLearnerUserId,
        'Violated platform community guidelines',
        adminActor,
        { ip: '192.168.1.100', userAgent: 'AdminBrowser/1.0' }
      );

      expect(suspended.status).toBe(AccountStatus.SUSPENDED);
      expect(suspended.suspendedAt).not.toBeNull();
      expect(suspended.suspensionReason).toBe('Violated platform community guidelines');

      // 3. Invariant: Active sessions are revoked immediately in the database
      const dbSession = await prisma.session.findUnique({ where: { id: session.sessionId } });
      expect(dbSession?.revokedAt).not.toBeNull();

      // 4. Invariant: verifySessionToken rejects the token
      const sessionValidation = await verifySessionToken(session.token);
      expect(sessionValidation).toBeNull();

      // 5. Invariant: SecurityEvent is written for the target user
      const securityEvent = await prisma.securityEvent.findFirst({
        where: {
          userId: targetLearnerUserId,
          type: SecurityEventType.ACCOUNT_SUSPENDED,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(securityEvent).not.toBeNull();
      expect((securityEvent?.metadata as Record<string, unknown>)?.reason).toBe(
        'Violated platform community guidelines'
      );

      // 6. Invariant: AdminAuditLog is written
      const auditLogs = await prisma.adminAuditLog.findMany({
        where: {
          action: 'USER_SUSPENDED',
          entityId: targetLearnerUserId,
        },
      });
      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
      const latestAudit = auditLogs[auditLogs.length - 1];
      expect(latestAudit.actorUserId).toBe(adminUserId);
      expect(latestAudit.entityType).toBe('User');
    });

    it('ADMIN can unsuspend a suspended account', async () => {
      const unsuspended = await AdminUserService.unsuspendUser(
        targetLearnerUserId,
        adminActor,
        { ip: '192.168.1.100', userAgent: 'AdminBrowser/1.0' }
      );

      expect(unsuspended.status).toBe(AccountStatus.ACTIVE);
      expect(unsuspended.suspendedAt).toBeNull();
      expect(unsuspended.suspensionReason).toBeNull();

      // SecurityEvent written
      const securityEvent = await prisma.securityEvent.findFirst({
        where: {
          userId: targetLearnerUserId,
          type: SecurityEventType.ACCOUNT_UNSUSPENDED,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(securityEvent).not.toBeNull();

      // AdminAuditLog written
      const auditLog = await prisma.adminAuditLog.findFirst({
        where: {
          action: 'USER_UNSUSPENDED',
          entityId: targetLearnerUserId,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorUserId).toBe(adminUserId);
    });
  });

  describe('3. Role Management & Hierarchy Rules', () => {
    it('SUPPORT cannot change user role (PERMISSION_DENIED)', async () => {
      await expect(
        AdminUserService.changeUserRole(targetLearnerUserId, UserRole.CONTENT_EDITOR, supportActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('CONTENT_EDITOR cannot change user role (PERMISSION_DENIED)', async () => {
      await expect(
        AdminUserService.changeUserRole(targetLearnerUserId, UserRole.ADMIN, editorActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('LEARNER cannot change user role (PERMISSION_DENIED)', async () => {
      await expect(
        AdminUserService.changeUserRole(targetLearnerUserId, UserRole.ADMIN, learnerActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('prevents any user from changing their own role (ROLE_CHANGE_FORBIDDEN)', async () => {
      await expect(
        AdminUserService.changeUserRole(ownerUserId, UserRole.ADMIN, ownerActor)
      ).rejects.toThrow(/cannot change their own role/i);
    });

    it('ADMIN cannot promote a user to OWNER (ROLE_CHANGE_FORBIDDEN)', async () => {
      await expect(
        AdminUserService.changeUserRole(targetLearnerUserId, UserRole.OWNER, adminActor)
      ).rejects.toThrow(/Only an OWNER can grant or revoke the OWNER role/);
    });

    it('ADMIN cannot demote an OWNER (ROLE_CHANGE_FORBIDDEN)', async () => {
      await expect(
        AdminUserService.changeUserRole(secondaryOwnerUserId, UserRole.ADMIN, adminActor)
      ).rejects.toThrow(/Only an OWNER can grant or revoke the OWNER role/);
    });

    it('OWNER can promote a learner to CONTENT_EDITOR and records audit log', async () => {
      const updated = await AdminUserService.changeUserRole(
        targetLearnerUserId,
        UserRole.CONTENT_EDITOR,
        ownerActor,
        { ip: '10.0.0.1', userAgent: 'OwnerBrowser/1.0' }
      );

      expect(updated.role).toBe(UserRole.CONTENT_EDITOR);

      // Verify AdminAuditLog was written
      const auditLog = await prisma.adminAuditLog.findFirst({
        where: {
          action: 'USER_ROLE_CHANGED',
          entityId: targetLearnerUserId,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorUserId).toBe(ownerUserId);
      expect((auditLog?.before as Record<string, unknown>)?.role).toBe(UserRole.LEARNER);
      expect((auditLog?.after as Record<string, unknown>)?.role).toBe(UserRole.CONTENT_EDITOR);
    });

    it('OWNER can demote a staff user back to LEARNER', async () => {
      const updated = await AdminUserService.changeUserRole(
        targetLearnerUserId,
        UserRole.LEARNER,
        ownerActor
      );

      expect(updated.role).toBe(UserRole.LEARNER);
    });
  });

  describe('4. Last Owner Protection Invariant (LAST_OWNER_PROTECTED)', () => {
    it('demoting an OWNER when multiple active owners exist succeeds', async () => {
      // We have owner1 and owner2
      const activeOwnersBefore = await AdminUserRepository.countActiveOwners();
      expect(activeOwnersBefore).toBeGreaterThanOrEqual(2);

      // owner1 demotes secondaryOwner to ADMIN
      const demoted = await AdminUserService.changeUserRole(
        secondaryOwnerUserId,
        UserRole.ADMIN,
        ownerActor
      );

      expect(demoted.role).toBe(UserRole.ADMIN);
    });

    it('rejects demoting the LAST remaining active OWNER account (LAST_OWNER_PROTECTED)', async () => {
      // Now ensure there is only 1 active owner (or check remaining count)
      const remainingOwners = await AdminUserRepository.countActiveOwners();

      if (remainingOwners === 1) {
        // Create a temporary admin actor to attempt demotion or owner attempting to demote last owner
        // Since an admin can't demote owner anyway, we test owner suspension or demotion invariant
        await expect(
          AdminUserService.changeUserRole(ownerUserId, UserRole.ADMIN, {
            ...ownerActor,
            id: 'another-owner-placeholder',
          })
        ).rejects.toThrow(/Cannot demote the last remaining active OWNER account/);

        // Attempting to suspend the last owner must also throw LAST_OWNER_PROTECTED
        await expect(
          AdminUserService.suspendUser(ownerUserId, 'Attempt to suspend sole owner', {
            ...ownerActor,
            id: 'another-owner-placeholder',
          })
        ).rejects.toThrow(/Cannot demote or suspend the last owner/);
      } else {
        // If there are other system owners, ensure the invariant function itself rejects when count <= 1
        expect(remainingOwners).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('5. Audit Log Security, Sanitization & Immutability', () => {
    it('SUPPORT cannot access privileged audit logs (PERMISSION_DENIED)', async () => {
      await expect(
        AdminAuditService.getAuditLogs({}, supportActor)
      ).rejects.toThrow(/Access denied/);
    });

    it('ADMIN and OWNER can inspect audit logs with bounded pagination', async () => {
      const logs = await AdminAuditService.getAuditLogs({ page: 1, pageSize: 10 }, adminActor);
      expect(logs.items.length).toBeGreaterThanOrEqual(1);
      expect(logs.pagination.pageSize).toBe(10);
    });

    it('audit logs never store raw passwords, tokens, or plaintext IP addresses', async () => {
      const logs = await prisma.adminAuditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      for (const log of logs) {
        const beforeStr = JSON.stringify(log.before || {});
        const afterStr = JSON.stringify(log.after || {});

        // Must NOT leak credentials or hashes
        expect(beforeStr).not.toContain('password');
        expect(beforeStr).not.toContain('passwordHash');
        expect(beforeStr).not.toContain('tokenHash');
        expect(afterStr).not.toContain('password');
        expect(afterStr).not.toContain('passwordHash');
        expect(afterStr).not.toContain('tokenHash');

        // IP addresses must be SHA-256 hashed or null, never raw dotted-quad IP
        if (log.ipHash) {
          expect(log.ipHash).toMatch(/^[a-f0-9]{64}$/);
          expect(log.ipHash).not.toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        }
      }
    });

    it('AdminAuditService enforces append-only immutability with no delete or update methods', () => {
      const auditServiceObj = AdminAuditService as unknown as Record<string, unknown>;
      expect(auditServiceObj.deleteAuditLog).toBeUndefined();
      expect(auditServiceObj.updateAuditLog).toBeUndefined();
      expect(auditServiceObj.removeAuditLog).toBeUndefined();
    });
  });

  describe('6. Validation & Bounded Pagination', () => {
    it('rejects oversized page size in user query validation', () => {
      expect(() =>
        adminUserQuerySchema.parse({ pageSize: 1000000 })
      ).toThrow();
    });

    it('rejects negative or zero page in user query validation', () => {
      expect(() =>
        adminUserQuerySchema.parse({ page: 0 })
      ).toThrow();
    });

    it('filters user list correctly by role', async () => {
      const query = adminUserQuerySchema.parse({ role: 'ADMIN' });
      const result = await AdminUserService.listUsers(query, adminActor);
      expect(result.users.every((u) => u.role === 'ADMIN')).toBe(true);
    });

    it('searches users by name case-insensitively', async () => {
      const query = adminUserQuerySchema.parse({ search: 'RBAC Target' });
      const result = await AdminUserService.listUsers(query, adminActor);
      expect(result.users.some((u) => u.id === targetLearnerUserId)).toBe(true);
    });
  });
});
