import { prisma } from '@/lib/db';
import { UserRole, AccountStatus } from '@prisma/client';

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
        onboardingProfile: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        onboardingProfile: true,
      },
    });
  }

  static async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
    timezone?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          role: data.role ?? UserRole.LEARNER,
          status: AccountStatus.ACTIVE,
        },
      });

      const profile = await tx.profile.create({
        data: {
          userId: user.id,
          timezone: data.timezone ?? 'Asia/Jakarta',
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          currentLevel: 1,
        },
      });

      return { ...user, profile };
    });
  }

  static async suspendUser(userId: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          status: AccountStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspensionReason: reason ?? 'Administrative suspension',
        },
      });

      // Revoke all active sessions upon suspension
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return user;
    });
  }

  static async unsuspendUser(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null,
      },
    });
  }

  static async updateRole(userId: string, role: UserRole) {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  static async getProfile(userId: string) {
    return prisma.profile.findUnique({
      where: { userId },
    });
  }

  static async getOnboarding(userId: string) {
    return prisma.onboardingProfile.findUnique({
      where: { userId },
    });
  }
}
