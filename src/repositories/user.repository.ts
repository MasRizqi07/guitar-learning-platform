import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

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
          role: data.role ?? UserRole.USER,
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
