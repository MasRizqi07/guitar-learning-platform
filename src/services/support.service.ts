import { SupportRepository } from '@/repositories/support.repository';
import { NotificationRepository } from '@/repositories/notification.repository';
import { AdminAuditService } from '@/services/admin-audit.service';
import { EmailService } from '@/services/email.service';
import { requirePermission } from '@/lib/permissions';
import { AppError } from '@/lib/errors';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
  NotificationType,
  DeliveryChannel,
  DeliveryStatus,
  Prisma,
} from '@prisma/client';

export const ALLOWED_TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  OPEN: [SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.RESOLVED],
  IN_PROGRESS: [SupportTicketStatus.WAITING_USER, SupportTicketStatus.RESOLVED],
  WAITING_USER: [SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.RESOLVED],
  RESOLVED: [SupportTicketStatus.CLOSED, SupportTicketStatus.OPEN],
  CLOSED: [],
};

export interface DiagnosticTelemetry {
  userAgent?: string;
  audioSampleRate?: number;
  audioContextState?: string;
  platform?: string;
  screenResolution?: string;
}

export class SupportService {
  /**
   * Sanitizes diagnostic telemetry to strictly bounded troubleshooting attributes
   * preventing arbitrary device fingerprinting or secret exfiltration
   */
  private static sanitizeTelemetry(
    raw?: DiagnosticTelemetry | Record<string, unknown>
  ): Prisma.InputJsonValue | undefined {
    if (!raw) return undefined;
    const allowed: DiagnosticTelemetry = {};
    if (typeof raw.userAgent === 'string') allowed.userAgent = raw.userAgent.slice(0, 300);
    if (typeof raw.audioSampleRate === 'number' && raw.audioSampleRate > 0 && raw.audioSampleRate < 384000) {
      allowed.audioSampleRate = raw.audioSampleRate;
    }
    if (typeof raw.audioContextState === 'string') {
      allowed.audioContextState = raw.audioContextState.slice(0, 50);
    }
    if (typeof raw.platform === 'string') allowed.platform = raw.platform.slice(0, 100);
    if (typeof raw.screenResolution === 'string') allowed.screenResolution = raw.screenResolution.slice(0, 50);
    return allowed as Prisma.InputJsonValue;
  }

  // ==========================================
  // LEARNER OPERATIONS (Zero-Trust IDOR Safe)
  // ==========================================

  /**
   * Learner creates a new support ticket
   */
  static async createTicket(
    userId: string,
    data: {
      category: SupportCategory;
      subject: string;
      body: string;
      telemetry?: DiagnosticTelemetry | Record<string, unknown>;
    },
    clientInfo: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required to create a support ticket');
    }

    const sanitizedTelemetry = this.sanitizeTelemetry({
      ...data.telemetry,
      userAgent: data.telemetry?.userAgent || clientInfo.userAgent || undefined,
    });

    const ticketWithInitial = await SupportRepository.createTicket({
      userId,
      category: data.category,
      subject: data.subject,
      body: data.body,
      telemetry: sanitizedTelemetry,
    });

    // 1. Create learner confirmation notification
    try {
      await NotificationRepository.create({
        userId,
        type: NotificationType.SUPPORT,
        title: `Support Ticket Created: ${ticketWithInitial.ticketNumber}`,
        message: `We received your ticket "${ticketWithInitial.subject}". Our staff will review it shortly.`,
        actionUrl: `/support/${ticketWithInitial.id}`,
        dedupeKey: `support-created:${ticketWithInitial.id}`,
      });
    } catch (notifErr) {
      console.warn('[SupportService] Non-fatal notification creation error:', notifErr);
    }

    // 2. Database-first non-authoritative email dispatch
    const user = await SupportRepository.findById(ticketWithInitial.id).then((t) => t?.user);
    if (user?.email) {
      const emailPromise = EmailService.sendSupportTicketCreatedEmail({
        to: user.email,
        name: user.name || 'Learner',
        ticketNumber: ticketWithInitial.ticketNumber,
        subject: ticketWithInitial.subject,
        viewUrl: `/support/${ticketWithInitial.id}`,
      })
        .then(async () => {
          await NotificationRepository.createDelivery({
            recipient: user.email,
            channel: DeliveryChannel.EMAIL,
            status: DeliveryStatus.SENT,
            sentAt: new Date(),
          });
        })
        .catch(async (emailErr) => {
          console.warn('[SupportService] Non-fatal email dispatch failure:', emailErr);
          await NotificationRepository.createDelivery({
            recipient: user.email,
            channel: DeliveryChannel.EMAIL,
            status: DeliveryStatus.FAILED,
            errorReason: emailErr instanceof Error ? emailErr.message : 'Email delivery failed',
          });
        });

      // Avoid unhandled promise rejection in background
      emailPromise.catch(() => {});
    }

    return ticketWithInitial;
  }

  /**
   * Retrieves a ticket for learner with strict IDOR verification
   * Invariant: Internal staff notes are NEVER queried or returned.
   */
  static async getLearnerTicket(ticketId: string, userId: string) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    // IDOR boundary
    if (ticket.userId !== userId) {
      throw AppError.forbidden('You do not have permission to view this support ticket');
    }

    return ticket;
  }

  /**
   * Lists tickets created by the authenticated learner
   */
  static async listLearnerTickets(
    userId: string,
    options: { page?: number; pageSize?: number; status?: SupportTicketStatus } = {}
  ) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }
    return SupportRepository.listByUser(userId, options);
  }

  /**
   * Learner replies to their own ticket
   */
  static async addLearnerReply(ticketId: string, userId: string, body: string) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    // IDOR boundary
    if (ticket.userId !== userId) {
      throw AppError.forbidden('You do not have permission to reply to this ticket');
    }

    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw AppError.validation('Cannot reply to a closed ticket. Please submit a new ticket.');
    }

    // Add public message
    const message = await SupportRepository.addMessage({
      ticketId,
      authorUserId: userId,
      body,
    });

    // Auto-transition workflow state on learner reply:
    // If ticket was WAITING_USER, learner has now answered -> transition to IN_PROGRESS
    if (ticket.status === SupportTicketStatus.WAITING_USER) {
      await SupportRepository.transitionStatus(ticketId, SupportTicketStatus.IN_PROGRESS);
    } else if (ticket.status === SupportTicketStatus.RESOLVED) {
      // Reopen if replying to a resolved ticket
      await SupportRepository.transitionStatus(ticketId, SupportTicketStatus.OPEN, { resolvedAt: null });
    }

    return message;
  }

  // ==========================================
  // STAFF OPERATIONS (RBAC Protected)
  // ==========================================

  /**
   * Retrieves the staff support queue with multi-criteria filtering
   */
  static async getStaffQueue(
    actor: { id: string; role?: string | null },
    query: {
      page?: number;
      pageSize?: number;
      status?: SupportTicketStatus | 'ALL';
      priority?: SupportTicketPriority | 'ALL';
      category?: SupportCategory | 'ALL';
      assignedToId?: string | 'UNASSIGNED';
      search?: string;
    }
  ) {
    requirePermission(actor, 'support.read');
    return SupportRepository.listStaffQueue(query);
  }

  /**
   * Retrieves full ticket details for authorized staff, including separate internal notes
   */
  static async getStaffTicketDetail(actor: { id: string; role?: string | null }, ticketId: string) {
    requirePermission(actor, 'support.read');

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    const internalNotes = await SupportRepository.getInternalNotes(ticketId);

    return {
      ...ticket,
      internalNotes,
    };
  }

  /**
   * Assigns or unassigns a ticket to a staff member
   */
  static async assignTicket(
    actor: { id: string; role?: string | null },
    ticketId: string,
    assignedToId: string | null,
    clientInfo: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    requirePermission(actor, 'support.update');

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    const updated = await SupportRepository.assignTicket(ticketId, assignedToId);

    // Audit log
    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: assignedToId ? 'SUPPORT_TICKET_ASSIGNED' : 'SUPPORT_TICKET_UNASSIGNED',
      entityType: 'SupportTicket',
      entityId: ticketId,
      before: { assignedToId: ticket.assignedToId },
      after: { assignedToId },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });

    return updated;
  }

  /**
   * Updates ticket priority
   */
  static async updatePriority(
    actor: { id: string; role?: string | null },
    ticketId: string,
    priority: SupportTicketPriority,
    clientInfo: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    requirePermission(actor, 'support.update');

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    const updated = await SupportRepository.updatePriority(ticketId, priority);

    // Audit log
    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: 'SUPPORT_TICKET_PRIORITY_CHANGED',
      entityType: 'SupportTicket',
      entityId: ticketId,
      before: { priority: ticket.priority },
      after: { priority },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });

    return updated;
  }

  /**
   * Transitions ticket status through the formal state machine
   */
  static async transitionStatus(
    actor: { id: string; role?: string | null },
    ticketId: string,
    nextStatus: SupportTicketStatus,
    clientInfo: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    requirePermission(actor, 'support.update');

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    // State machine validation
    const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw AppError.validation(
        `Invalid status transition from ${ticket.status} to ${nextStatus}. Allowed: [${allowed.join(', ')}]`
      );
    }

    const timestamps: { resolvedAt?: Date | null; closedAt?: Date | null } = {};
    let auditAction = 'SUPPORT_TICKET_STATUS_CHANGED';

    if (nextStatus === SupportTicketStatus.RESOLVED) {
      timestamps.resolvedAt = new Date();
      auditAction = 'SUPPORT_TICKET_RESOLVED';
    } else if (nextStatus === SupportTicketStatus.CLOSED) {
      timestamps.closedAt = new Date();
      auditAction = 'SUPPORT_TICKET_CLOSED';
    } else if (nextStatus === SupportTicketStatus.OPEN) {
      timestamps.resolvedAt = null;
      timestamps.closedAt = null;
    }

    const updated = await SupportRepository.transitionStatus(ticketId, nextStatus, timestamps);

    // Audit log
    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: auditAction,
      entityType: 'SupportTicket',
      entityId: ticketId,
      before: { status: ticket.status },
      after: { status: nextStatus },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });

    // Notify learner on resolution
    if (nextStatus === SupportTicketStatus.RESOLVED) {
      try {
        await NotificationRepository.create({
          userId: ticket.userId,
          type: NotificationType.SUPPORT,
          title: `Support Ticket Resolved: ${ticket.ticketNumber}`,
          message: `Your support ticket "${ticket.subject}" has been marked as resolved.`,
          actionUrl: `/support/${ticket.id}`,
          dedupeKey: `support-resolved:${ticket.id}:${timestamps.resolvedAt?.getTime()}`,
        });
      } catch (notifErr) {
        console.warn('[SupportService] Non-fatal notification error on resolution:', notifErr);
      }

      // Non-authoritative email dispatch
      if (ticket.user?.email) {
        EmailService.sendSupportResolvedEmail({
          to: ticket.user.email,
          name: ticket.user.name || 'Learner',
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          viewUrl: `/support/${ticket.id}`,
        }).catch((err) => console.warn('[SupportService] Non-fatal resolve email failure:', err));
      }
    }

    return updated;
  }

  /**
   * Adds a public staff reply to a ticket
   * - Records firstResponseAt on the first public staff response
   * - Notifies the learner
   * - Sends transactional reply email
   */
  static async addStaffReply(
    actor: { id: string; role?: string | null },
    ticketId: string,
    body: string,
    nextStatus?: SupportTicketStatus,
    clientInfo: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    requirePermission(actor, 'support.update');

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    // 1. Add public message
    const message = await SupportRepository.addMessage({
      ticketId,
      authorUserId: actor.id,
      body,
    });

    // 2. Set first response timestamp if null (only public staff responses count!)
    await SupportRepository.recordFirstResponseIfNull(ticketId);

    // 3. Handle status change if requested (e.g. moving to WAITING_USER)
    if (nextStatus && nextStatus !== ticket.status) {
      const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
      if (allowed.includes(nextStatus)) {
        await this.transitionStatus(actor, ticketId, nextStatus, clientInfo);
      }
    }

    // 4. Create learner notification
    try {
      await NotificationRepository.create({
        userId: ticket.userId,
        type: NotificationType.SUPPORT,
        title: `New Reply on Ticket: ${ticket.ticketNumber}`,
        message: body.slice(0, 140),
        actionUrl: `/support/${ticket.id}`,
        dedupeKey: `support-message:${message.id}`,
      });
    } catch (notifErr) {
      console.warn('[SupportService] Non-fatal notification error on staff reply:', notifErr);
    }

    // 5. Database-first non-authoritative email dispatch
    if (ticket.user?.email) {
      EmailService.sendSupportReplyEmail({
        to: ticket.user.email,
        name: ticket.user.name || 'Learner',
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        replySnippet: body.slice(0, 160),
        viewUrl: `/support/${ticket.id}`,
      }).catch((err) => console.warn('[SupportService] Non-fatal reply email failure:', err));
    }

    return message;
  }

  /**
   * Adds an internal staff note to a ticket
   * - Stored in a completely separate table (SupportInternalNote)
   * - Invariant: NEVER notified to the learner
   * - Invariant: NEVER emailed to the learner
   * - Invariant: Full note body is NEVER recorded into AdminAuditLog
   */
  static async addStaffInternalNote(
    actor: { id: string; role?: string | null },
    ticketId: string,
    body: string,
    clientInfo: { ip?: string | null; userAgent?: string | null } = {}
  ) {
    requirePermission(actor, 'support.update');

    const ticket = await SupportRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('SUPPORT_TICKET_NOT_FOUND', `Support ticket ${ticketId} not found`);
    }

    const note = await SupportRepository.addInternalNote({
      ticketId,
      authorUserId: actor.id,
      body,
    });

    // Privileged audit log without message body duplication
    await AdminAuditService.recordAction({
      actorUserId: actor.id,
      action: 'SUPPORT_INTERNAL_NOTE_ADDED',
      entityType: 'SupportTicket',
      entityId: ticketId,
      before: null,
      after: {
        noteId: note.id,
        authorUserId: actor.id,
      },
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });

    return note;
  }
}
