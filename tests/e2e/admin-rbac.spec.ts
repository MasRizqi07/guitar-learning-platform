import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth';
import { UserRole, AccountStatus } from '@prisma/client';

test.describe('Admin Operations & RBAC E2E Flow', () => {
  const timestamp = Date.now();
  const ownerUser = {
    name: 'E2E Platform Owner',
    email: `e2e_owner_${timestamp}@example.com`,
    password: 'OwnerPassword123!',
  };
  const learnerUser = {
    name: 'E2E Managed Learner',
    email: `e2e_target_${timestamp}@example.com`,
    password: 'LearnerPassword123!',
  };

  test.beforeAll(async () => {
    // Seed initial test owner directly with OWNER role and completed onboarding
    const passwordHash = await hashPassword(ownerUser.password);
    await prisma.user.create({
      data: {
        name: ownerUser.name,
        email: ownerUser.email,
        passwordHash,
        role: UserRole.OWNER,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
        onboardingProfile: {
          create: {
            completed: true,
            experienceLevel: 'INTERMEDIATE',
            guitarType: 'ELECTRIC',
            dailyGoalMinutes: 30,
          },
        },
      },
    });

    // Seed target learner user
    const learnerHash = await hashPassword(learnerUser.password);
    await prisma.user.create({
      data: {
        name: learnerUser.name,
        email: learnerUser.email,
        passwordHash: learnerHash,
        role: UserRole.LEARNER,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
        onboardingProfile: {
          create: {
            completed: true,
            experienceLevel: 'BEGINNER',
            guitarType: 'ACOUSTIC',
            dailyGoalMinutes: 15,
          },
        },
      },
    });
  });

  test.afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [ownerUser.email, learnerUser.email] },
      },
    }).catch(() => null);
    await prisma.$disconnect();
  });

  test('Owner logs in, accesses admin workspace, manages user, and inspects audit logs', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Fill credentials
    await page.getByLabel(/email address/i).fill(ownerUser.email);
    await page.getByLabel(/password/i).fill(ownerUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // 2. Arrives at dashboard
    await page.waitForURL(/\/dashboard/);

    // 3. Navigate to Admin
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /system overview/i })).toBeVisible();

    // 4. Verify metric cards are rendered
    await expect(page.getByText(/total accounts/i)).toBeVisible();
    await expect(page.getByText(/active learners/i)).toBeVisible();

    // 5. Navigate to User Directory
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /user directory/i })).toBeVisible();

    // 6. Search for the target learner
    const searchInput = page.getByPlaceholder(/search by name or email/i);
    await searchInput.fill(learnerUser.email);
    await page.waitForTimeout(500); // debounce wait

    // Verify row for target learner is displayed
    const userRow = page.locator('tr', { hasText: learnerUser.email });
    await expect(userRow).toBeVisible();

    // 7. Click Manage to open user detail page
    const manageLink = userRow.getByRole('link', { name: /manage/i });
    await manageLink.click();

    await page.waitForURL(/\/admin\/users\/.+/);
    await expect(page.getByText(learnerUser.email)).toBeVisible();

    // 8. Suspend Learner Account
    const suspendBtn = page.getByRole('button', { name: /suspend account/i });
    await expect(suspendBtn).toBeVisible();
    await suspendBtn.click();

    // Modal opens
    await expect(page.getByRole('heading', { name: /confirm account suspension/i })).toBeVisible();
    const reasonTextarea = page.getByPlaceholder(/e\.g\. terms violation/i);
    await reasonTextarea.fill('E2E automated compliance test suspension');
    await page.getByRole('button', { name: /confirm suspension/i }).click();

    // Success feedback and status badge update
    await expect(page.getByText(/account suspended successfully/i)).toBeVisible();
    await expect(page.locator('span', { hasText: /^SUSPENDED$/i })).toBeVisible();

    // 9. Unsuspend Account
    const unsuspendBtn = page.getByRole('button', { name: /unsuspend account/i });
    await expect(unsuspendBtn).toBeVisible();
    await unsuspendBtn.click();

    // Modal opens
    const unsuspendModal = page.locator('div.fixed');
    await expect(unsuspendModal.getByRole('heading', { name: /confirm unsuspension/i })).toBeVisible();
    await unsuspendModal.getByRole('button', { name: /unsuspend account/i }).click();

    // Success feedback and status badge update
    await expect(page.getByText(/account unsuspended successfully/i)).toBeVisible();
    await expect(page.locator('span', { hasText: /^ACTIVE$/i })).toBeVisible();

    // 10. Role Management
    const changeRoleBtn = page.getByRole('button', { name: /change role/i });
    await expect(changeRoleBtn).toBeVisible();
    await changeRoleBtn.click();

    const roleModal = page.locator('div.fixed');
    await expect(roleModal.getByRole('heading', { name: /change user role/i })).toBeVisible();
    await roleModal.locator('select').selectOption('CONTENT_EDITOR');
    await roleModal.getByRole('button', { name: /update role/i }).click();

    await expect(page.getByText(/role successfully updated to CONTENT_EDITOR/i)).toBeVisible();

    // 11. Navigate to Audit Log
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { name: /privileged audit log/i })).toBeVisible();

    // Verify recent actions appear in table
    await expect(page.locator('tr', { hasText: 'USER_SUSPENDED' })).toBeVisible();
    await expect(page.locator('tr', { hasText: 'USER_ROLE_CHANGED' })).toBeVisible();
  });
});
