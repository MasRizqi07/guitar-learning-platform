import { prisma } from '@/lib/db';
import { Prisma, UserRole, AccountStatus, LessonProgressStatus } from '@prisma/client';
import { AdminUserQueryInput } from '@/validations/admin';

export class AdminUserRepository {
  /**
   * Queries paginated users based on filter and search parameters
   */
  static async findUsers(query: AdminUserQueryInput) {
    const { page, pageSize, search, role, status, verified, sortBy, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role as UserRole;
    }

    if (status && status !== 'ALL') {
      where.status = status as AccountStatus;
    }

    if (verified === 'VERIFIED') {
      where.emailVerified = { not: null };
    } else if (verified === 'UNVERIFIED') {
      where.emailVerified = null;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          suspendedAt: true,
          suspensionReason: true,
          profile: {
            select: {
              currentLevel: true,
              totalXP: true,
              lastActiveDate: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Retrieves full diagnostic user detail without exposing sensitive credentials or token hashes
   */
  static async findUserDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        suspendedAt: true,
        suspensionReason: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            currentLevel: true,
            totalXP: true,
            currentStreak: true,
            longestStreak: true,
            timezone: true,
            lastActiveDate: true,
          },
        },
        onboardingProfile: {
          select: {
            experienceLevel: true,
            guitarType: true,
            dailyGoalMinutes: true,
            completed: true,
            completedAt: true,
          },
        },
        _count: {
          select: {
            sessions: {
              where: {
                revokedAt: null,
                expiresAt: { gt: new Date() },
              },
            },
            lessonProgress: {
              where: { status: LessonProgressStatus.COMPLETED },
            },
            practiceSessions: true,
            quizAttempts: true,
            userAchievements: true,
          },
        },
      },
    });

    if (!user) return null;

    // Fetch recent security events (sanitized)
    const securityEvents = await prisma.securityEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        ipHash: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      securityEvents,
    };
  }

  /**
   * Counts currently active OWNER users for LAST_OWNER_PROTECTED invariant
   */
  static async countActiveOwners(): Promise<number> {
    return prisma.user.count({
      where: {
        role: UserRole.OWNER,
        status: AccountStatus.ACTIVE,
      },
    });
  }

  /**
   * Aggregates operational overview metrics for the /admin dashboard
   */
  static async getAdminOverviewMetrics() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      verifiedUsers,
      recentRegistrations,
      recentSecurityEvents,
      recentAdminActions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: AccountStatus.ACTIVE } }),
      prisma.user.count({ where: { status: AccountStatus.SUSPENDED } }),
      prisma.user.count({ where: { status: AccountStatus.BANNED } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          userId: true,
          ipHash: true,
          createdAt: true,
          user: {
            select: { email: true, name: true },
          },
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          actor: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      metrics: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        bannedUsers,
        verifiedUsers,
      },
      recentRegistrations,
      recentSecurityEvents,
      recentAdminActions,
    };
  }
}
