import { prisma } from '@/lib/db';
import { UserRole, AccountStatus, SecurityEventType } from '@prisma/client';
import { AdminUserRepository } from '@/repositories/admin-user.repository';
import { AdminAuditService } from '@/services/admin-audit.service';
import { SecurityEventService } from '@/services/security-event.service';
import { requirePermission, normalizeRole } from '@/lib/permissions';
import { SessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { AdminUserQueryInput } from '@/validations/admin';

export class AdminUserService {
  /**
   * Retrieves operational overview metrics for authorized staff
   */
  static async getOverview(actor: SessionUser) {
    if (!['SUPPORT', 'CONTENT_EDITOR', 'ADMIN', 'OWNER'].includes(normalizeRole(actor.role))) {
      throw AppError.adminAccessRequired();
    }
    return AdminUserRepository.getAdminOverviewMetrics();
  }

  /**
   * Lists users with search, filters, and pagination
   */
  static async listUsers(query: AdminUserQueryInput, actor: SessionUser) {
    requirePermission(actor, 'user.read');
    return AdminUserRepository.findUsers(query);
  }

  /**
   * Retrieves full diagnostic user detail and related audit logs
   */
  static async getUserDetail(targetUserId: string, actor: SessionUser) {
    requirePermission(actor, 'user.read');

    const user = await AdminUserRepository.findUserDetail(targetUserId);
    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    const auditHistory = await AdminAuditService.getEntityAuditLogs('User', targetUserId, 15);

    return {
      ...user,
      auditHistory,
    };
  }

  /**
   * Suspends a user account, revoking all active sessions and recording audit logs
   */
  static async suspendUser(
    targetUserId: string,
    reason: string,
    actor: SessionUser,
    clientMeta?: { ip?: string; userAgent?: string }
  ) {
    requirePermission(actor, 'user.suspend');

    // Self-protection invariant
    if (targetUserId === actor.id) {
      throw AppError.cannotSuspendSelf();
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!targetUser) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    if (targetUser.status === AccountStatus.SUSPENDED) {
      throw AppError.badRequest('User account is already suspended');
    }

    // Protection for OWNER accounts
    if (targetUser.role === UserRole.OWNER) {
      if (normalizeRole(actor.role) !== 'OWNER') {
        throw AppError.forbidden('Only an OWNER can suspend another OWNER account');
      }
      const activeOwners = await AdminUserRepository.countActiveOwners();
      if (activeOwners <= 1) {
        throw AppError.lastOwnerProtected();
      }
    }

    const oldStatus = targetUser.status;

    // Transactional suspension and session revocation
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: AccountStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspensionReason: reason,
        },
      });

      await tx.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return user;
    });

    // Record SecurityEvent for the target user
    await SecurityEventService.recordEvent({
      userId: targetUserId,
      type: SecurityEventType.ACCOUNT_SUSPENDED,
      userAgent: clientMeta?.userAgent,
      metadata: { reason, suspendedBy: actor.id },
    });

    // Record AdminAuditLog for the staff action
    await AdminAuditService.recordAdminAction({
      actorUserId: actor.id,
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: targetUserId,
      before: { status: oldStatus },
      after: { status: AccountStatus.SUSPENDED, reason },
      ip: clientMeta?.ip,
      userAgent: clientMeta?.userAgent,
    });

    return updated;
  }

  /**
   * Unsuspends a user account, returning it to ACTIVE status
   */
  static async unsuspendUser(
    targetUserId: string,
    actor: SessionUser,
    clientMeta?: { ip?: string; userAgent?: string }
  ) {
    requirePermission(actor, 'user.suspend');

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!targetUser) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    if (targetUser.status !== AccountStatus.SUSPENDED) {
      throw AppError.badRequest('User account is not currently suspended');
    }

    const oldStatus = targetUser.status;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: AccountStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    // Record SecurityEvent
    await SecurityEventService.recordEvent({
      userId: targetUserId,
      type: SecurityEventType.ACCOUNT_UNSUSPENDED,
      userAgent: clientMeta?.userAgent,
      metadata: { unsuspendedBy: actor.id },
    });

    // Record AdminAuditLog
    await AdminAuditService.recordAdminAction({
      actorUserId: actor.id,
      action: 'USER_UNSUSPENDED',
      entityType: 'User',
      entityId: targetUserId,
      before: { status: oldStatus },
      after: { status: AccountStatus.ACTIVE },
      ip: clientMeta?.ip,
      userAgent: clientMeta?.userAgent,
    });

    return updated;
  }

  /**
   * Modifies a user's role while enforcing strict hierarchy and LAST_OWNER_PROTECTED invariants
   */
  static async changeUserRole(
    targetUserId: string,
    newRole: UserRole,
    actor: SessionUser,
    clientMeta?: { ip?: string; userAgent?: string }
  ) {
    requirePermission(actor, 'role.manage');

    // Self-protection: users cannot change their own role
    if (targetUserId === actor.id) {
      throw AppError.roleChangeForbidden('Administrators cannot change their own role');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!targetUser) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    if (targetUser.role === newRole) {
      return targetUser;
    }

    // Invariant: Non-owner cannot promote someone to OWNER or demote an OWNER
    const actorRole = normalizeRole(actor.role);
    if (actorRole !== 'OWNER' && (newRole === 'OWNER' || targetUser.role === UserRole.OWNER)) {
      throw AppError.roleChangeForbidden('Only an OWNER can grant or revoke the OWNER role');
    }

    // Invariant: LAST_OWNER_PROTECTED
    if (targetUser.role === UserRole.OWNER && newRole !== 'OWNER') {
      const activeOwners = await AdminUserRepository.countActiveOwners();
      if (activeOwners <= 1) {
        throw AppError.lastOwnerProtected('Cannot demote the last remaining active OWNER account');
      }
    }

    const oldRole = targetUser.role;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    // Record AdminAuditLog
    await AdminAuditService.recordAdminAction({
      actorUserId: actor.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: targetUserId,
      before: { role: oldRole },
      after: { role: newRole },
      ip: clientMeta?.ip,
      userAgent: clientMeta?.userAgent,
    });

    return updated;
  }
}
