import { prisma } from '@/lib/db';
import {
  SupportTicket,
  SupportMessage,
  SupportInternalNote,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportCategory,
  Prisma,
} from '@prisma/client';

export class SupportRepository {
  /**
   * Generates next human-readable ticket number (e.g. SUP-2026-000001)
   */
  private static async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.supportTicket.count();
    const sequence = String(count + 1).padStart(6, '0');
    return `SUP-${year}-${sequence}`;
  }

  /**
   * Creates a support ticket along with its initial user message
   */
  static async createTicket(params: {
    userId: string;
    category: SupportCategory;
    subject: string;
    body: string;
    telemetry?: Prisma.InputJsonValue;
  }): Promise<SupportTicket & { messages: SupportMessage[] }> {
    const ticketNumber = await this.generateTicketNumber();

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          ticketNumber,
          userId: params.userId,
          category: params.category,
          subject: params.subject,
          status: SupportTicketStatus.OPEN,
          priority: SupportTicketPriority.NORMAL,
          telemetry: params.telemetry,
        },
      });

      const initialMessage = await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          authorUserId: params.userId,
          body: params.body,
        },
      });

      return {
        ...ticket,
        messages: [initialMessage],
      };
    });
  }

  /**
   * Find ticket by ID with public messages and author names
   */
  static async findById(id: string) {
    return prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
  }

  /**
   * Find ticket by ticket number
   */
  static async findByTicketNumber(ticketNumber: string) {
    return prisma.supportTicket.findUnique({
      where: { ticketNumber },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * List tickets created by a specific learner (IDOR boundary)
   */
  static async listByUser(
    userId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: SupportTicketStatus;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupportTicketWhereInput = {
      userId,
      ...(options.status ? { status: options.status } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * List support queue for staff members with multi-criteria filtering
   */
  static async listStaffQueue(options: {
    page?: number;
    pageSize?: number;
    status?: SupportTicketStatus | 'ALL';
    priority?: SupportTicketPriority | 'ALL';
    category?: SupportCategory | 'ALL';
    assignedToId?: string | 'UNASSIGNED';
    search?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupportTicketWhereInput = {};

    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
    }
    if (options.priority && options.priority !== 'ALL') {
      where.priority = options.priority;
    }
    if (options.category && options.category !== 'ALL') {
      where.category = options.category;
    }
    if (options.assignedToId === 'UNASSIGNED') {
      where.assignedToId = null;
    } else if (options.assignedToId) {
      where.assignedToId = options.assignedToId;
    }
    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { messages: true, internalNotes: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Assign ticket to a staff member (or unassign)
   */
  static async assignTicket(ticketId: string, assignedToId: string | null) {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Update ticket priority
   */
  static async updatePriority(ticketId: string, priority: SupportTicketPriority) {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority },
    });
  }

  /**
   * Transition ticket status
   */
  static async transitionStatus(
    ticketId: string,
    status: SupportTicketStatus,
    timestamps: { resolvedAt?: Date | null; closedAt?: Date | null } = {}
  ) {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(timestamps.resolvedAt !== undefined ? { resolvedAt: timestamps.resolvedAt } : {}),
        ...(timestamps.closedAt !== undefined ? { closedAt: timestamps.closedAt } : {}),
      },
    });
  }

  /**
   * Record first response timestamp if not already set
   */
  static async recordFirstResponseIfNull(ticketId: string, timestamp: Date = new Date()) {
    const existing = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { firstResponseAt: true },
    });

    if (existing && !existing.firstResponseAt) {
      return prisma.supportTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: timestamp },
      });
    }
    return existing;
  }

  /**
   * Add public message to ticket
   */
  static async addMessage(params: {
    ticketId: string;
    authorUserId: string;
    body: string;
  }): Promise<SupportMessage> {
    return prisma.supportMessage.create({
      data: {
        ticketId: params.ticketId,
        authorUserId: params.authorUserId,
        body: params.body,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * Add internal staff note (SEPARATE table from public messages)
   */
  static async addInternalNote(params: {
    ticketId: string;
    authorUserId: string;
    body: string;
  }): Promise<SupportInternalNote> {
    return prisma.supportInternalNote.create({
      data: {
        ticketId: params.ticketId,
        authorUserId: params.authorUserId,
        body: params.body,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * Retrieve internal staff notes for a ticket (STRICTLY STAFF PRIVILEGE)
   */
  static async getInternalNotes(ticketId: string): Promise<SupportInternalNote[]> {
    return prisma.supportInternalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }
}
