import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AuthService } from '@/services/auth.service';
import { OnboardingService } from '@/services/onboarding.service';

describe('Auth & Onboarding Integration', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  let userId = '';

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    }
    await prisma.$disconnect();
  });

  it('registers a new user and creates their default profile', async () => {
    const user = await AuthService.register({
      name: 'Adi Learner',
      email: testEmail,
      password: 'securepassword123',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe('Adi Learner');
    userId = user.id;

    // Verify DB records
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    expect(dbUser).not.toBeNull();
    expect(dbUser?.passwordHash).not.toBe('securepassword123'); // Hashed!
    expect(dbUser?.profile).not.toBeNull();
    expect(dbUser?.profile?.totalXP).toBe(0);
    expect(dbUser?.profile?.currentStreak).toBe(0);
  });

  it('rejects duplicate email registration', async () => {
    await expect(
      AuthService.register({
        name: 'Duplicate',
        email: testEmail,
        password: 'password123',
      })
    ).rejects.toThrow();
  });

  it('authenticates with correct credentials and rejects incorrect credentials', async () => {
    const loggedIn = await AuthService.login({
      email: testEmail,
      password: 'securepassword123',
    });
    expect(loggedIn.id).toBe(userId);

    await expect(
      AuthService.login({
        email: testEmail,
        password: 'wrongpassword',
      })
    ).rejects.toThrow();
  });

  it('completes onboarding and persists choices & placement', async () => {
    const onboardingResult = await OnboardingService.completeOnboarding(userId, {
      experienceLevel: 'ABSOLUTE_BEGINNER',
      guitarType: 'ACOUSTIC',
      dailyGoalMinutes: 15,
      learningGoalCodes: ['PLAY_FAVORITE_SONGS', 'LEARN_FROM_ZERO'],
      timezone: 'Asia/Jakarta',
    });

    expect(onboardingResult.recommendedLevel).toBe('BEGINNER_1');
    expect(onboardingResult.startingLessonOrder).toBe(1);

    // Verify DB persistence
    const status = await OnboardingService.getOnboardingStatus(userId);
    expect(status.completed).toBe(true);
    expect(status.onboarding?.guitarType).toBe('ACOUSTIC');
    expect(status.onboarding?.dailyGoalMinutes).toBe(15);
    expect(status.goals.length).toBe(2);

    const currentUser = await AuthService.getCurrentUser(userId);
    expect(currentUser.onboardingCompleted).toBe(true);
  });
});
