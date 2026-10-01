import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { SecurityEventService } from '@/services/security-event.service';
import { SecurityEventType, AccountStatus } from '@prisma/client';

export class DataPrivacyService {
  /**
   * Generates a comprehensive, GDPR-compliant export of user personal data.
   * Strictly omits password hashes, internal staff notes, and session tokens.
   */
  static async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        onboardingProfile: true,
        userLearningGoals: {
          include: {
            learningGoal: true,
          },
        },
        lessonProgress: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        practiceSessions: true,
        quizAttempts: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        userAchievements: {
          include: {
            achievement: {
              select: {
                id: true,
                code: true,
                name: true,
                xpReward: true,
              },
            },
          },
        },
        xpTransactions: true,
        supportTickets: {
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            closedAt: true,
            messages: {
              select: {
                id: true,
                authorUserId: true,
                body: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            // supportInternalNotes are strictly excluded to guarantee zero staff note leakage
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User record not found.');
    }

    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        platform: 'FretFlow Guitar Learning Platform v2',
        schemaVersion: '2.0.0',
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: user.profile,
      onboarding: user.onboardingProfile,
      goals: user.userLearningGoals,
      curriculumProgress: {
        lessons: user.lessonProgress,
        practiceSessions: user.practiceSessions,
        quizzes: user.quizAttempts,
        achievements: user.userAchievements,
        xpTransactions: user.xpTransactions,
      },
      supportTickets: user.supportTickets,
    };
  }

  /**
   * Initiates safe account deletion workflow.
   * Sets status to DELETION_PENDING, revokes all sessions, and logs security audit.
   */
  static async requestAccountDeletion(userId: string, reason?: string, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User record not found.');
    }

    if (user.status === AccountStatus.DELETION_PENDING || user.status === AccountStatus.DELETED) {
      return { status: user.status, deletedAt: user.deletedAt };
    }

    const deletionTimestamp = new Date();

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Mark account as DELETION_PENDING
      const res = await tx.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.DELETION_PENDING,
          deletedAt: deletionTimestamp,
          suspensionReason: reason ? `Deletion requested: ${reason}` : 'User requested account deletion',
        },
      });

      // 2. Revoke all active sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      return res;
    });

    // 3. Log security event
    await SecurityEventService.recordEvent({
      userId,
      type: SecurityEventType.ACCOUNT_DELETION_REQUESTED,
      ip,
      userAgent,
      metadata: {
        requestedAt: deletionTimestamp.toISOString(),
        reason: reason || 'Self-service deletion request',
      },
    });

    return {
      status: updatedUser.status,
      deletedAt: updatedUser.deletedAt,
    };
  }
}
