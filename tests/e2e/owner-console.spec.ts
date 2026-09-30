import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth';
import { UserRole, AccountStatus } from '@prisma/client';

test.describe('Owner Console, Analytics, Feature Flags & Governance E2E Flow', () => {
  const timestamp = Date.now();
  const ownerUser = {
    name: 'E2E Executive Owner',
    email: `e2e_owner_${timestamp}@example.com`,
    password: 'OwnerPassword123!',
  };
  const adminUser = {
    name: 'E2E Strict Admin',
    email: `e2e_admin_${timestamp}@example.com`,
    password: 'AdminPassword123!',
  };

  test.beforeAll(async () => {
    // 1. Seed Owner User with completed onboarding
    const ownerHash = await hashPassword(ownerUser.password);
    await prisma.user.create({
      data: {
        name: ownerUser.name,
        email: ownerUser.email,
        passwordHash: ownerHash,
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

    // 2. Seed Admin User
    const adminHash = await hashPassword(adminUser.password);
    await prisma.user.create({
      data: {
        name: adminUser.name,
        email: adminUser.email,
        passwordHash: adminHash,
        role: UserRole.ADMIN,
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
    // Teardown created users
    await prisma.user.deleteMany({
      where: {
        email: { in: [ownerUser.email, adminUser.email] },
      },
    }).catch(() => null);

    // Ensure platform settings restored
    await prisma.platformSetting.upsert({
      where: { key: 'REGISTRATION_ENABLED' },
      update: { value: true },
      create: { key: 'REGISTRATION_ENABLED', value: true },
    }).catch(() => null);

    await prisma.platformSetting.upsert({
      where: { key: 'MAINTENANCE_MODE' },
      update: { value: false },
      create: { key: 'MAINTENANCE_MODE', value: false },
    }).catch(() => null);

    await prisma.$disconnect();
  });

  test('Owner logs in, navigates through analytics suites, toggles flag, updates settings, and inspects audit', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Fill credentials as Owner
    await page.getByLabel(/email address/i).fill(ownerUser.email);
    await page.getByLabel(/password/i).fill(ownerUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Arrives at learner dashboard
    await page.waitForURL(/\/dashboard/);

    // 2. Navigate to Owner Console
    await page.goto('/owner');
    await expect(page.getByRole('heading', { name: /executive overview/i })).toBeVisible();

    // Verify authoritative KPI cards render
    await expect(page.getByText(/total learners/i)).toBeVisible();
    await expect(page.getByText(/new registrations/i)).toBeVisible();
    await expect(page.getByText(/active learners/i)).toBeVisible();
    await expect(page.getByText(/stickiness/i)).toBeVisible();

    // 3. Navigate to User Growth & Retention
    await page.goto('/owner/analytics/users');
    await expect(page.getByRole('heading', { name: /user growth & retention/i })).toBeVisible();

    // Verify 6-stage funnel & cohort matrix are present
    await expect(page.getByText(/official 6-stage activation funnel/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /cohort retention/i })).toBeVisible();

    // Test date range switch
    const range7dBtn = page.getByRole('button', { name: /7 days/i });
    if (await range7dBtn.isVisible()) {
      await range7dBtn.click();
    }

    // 4. Navigate to Learning & Practice Analytics
    await page.goto('/owner/analytics/learning');
    await expect(page.getByRole('heading', { name: /learning & practice analytics/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /practice type breakdown/i })).toBeVisible();

    // 5. Navigate to Content Performance Analytics
    await page.goto('/owner/analytics/content');
    await expect(page.getByRole('heading', { name: /content & lesson performance/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /lesson engagement & drop-off breakdown/i })).toBeVisible();

    // 6. Navigate to Feature Flags Management
    await page.goto('/owner/features');
    await expect(page.getByRole('heading', { name: /feature flags & capabilities/i })).toBeVisible();

    // Create a new flag in UI
    const createBtn = page.getByRole('button', { name: /create feature flag/i });
    await createBtn.click();

    const flagKey = `E2E_FLAG_${timestamp}`;
    await page.getByPlaceholder(/e\.g\. AI_TUTOR/i).fill(flagKey);
    await page.getByPlaceholder(/operational purpose/i).fill('E2E Automated test flag');
    await page.getByRole('button', { name: /^create flag$/i }).click();

    // Verify success banner and new flag in listing
    await expect(page.getByText(/created successfully/i)).toBeVisible();
    await expect(page.getByText(flagKey, { exact: true })).toBeVisible();

    // 7. Navigate to Platform Settings & System
    await page.goto('/owner/system');
    await expect(page.getByRole('heading', { name: /platform governance & system settings/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /learner registration gate/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /platform maintenance lock/i })).toBeVisible();

    // Update support email
    const emailInput = page.getByPlaceholder(/support@guitarlearning\.com/i);
    await expect(emailInput).not.toHaveValue('');
    const freshSupportEmail = `test_support_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
    await emailInput.fill(freshSupportEmail);
    const saveEmailBtn = page.getByRole('button', { name: /save email/i });
    await expect(saveEmailBtn).toBeEnabled();
    await saveEmailBtn.click();
    await expect(page.getByText(/support email updated successfully/i)).toBeVisible();

    // 8. Navigate to Privileged Audit Logs
    await page.goto('/owner/audit');
    await expect(page.getByRole('heading', { name: /privileged platform audit/i })).toBeVisible();
    await expect(page.getByText(/privileged audit records/i)).toBeVisible();

    // Verify that our FEATURE_FLAG_CREATED or PLATFORM_SETTING_UPDATED action appears
    await expect(page.getByText(/PLATFORM_SETTING_UPDATED|FEATURE_FLAG_CREATED/).first()).toBeVisible();
  });

  test('ADMIN user is strictly denied access to /owner with HTTP 403 OWNER_ACCESS_REQUIRED', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(adminUser.email);
    await page.getByLabel(/password/i).fill(adminUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard/);

    // 2. Attempt navigating directly to /owner
    await page.goto('/owner');

    // 3. Verify Access Denied screen with HTTP 403 OWNER_ACCESS_REQUIRED
    await expect(page.getByText(/HTTP 403 · OWNER_ACCESS_REQUIRED/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /access denied/i })).toBeVisible();
    await expect(page.getByText(/strictly restricted to platform OWNER accounts/i)).toBeVisible();

    // Verify admin cannot see owner metrics or controls
    await expect(page.getByText(/total learners/i)).not.toBeVisible();
  });
});
