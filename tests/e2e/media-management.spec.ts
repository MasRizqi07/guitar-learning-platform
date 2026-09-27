import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth';
import { UserRole, AccountStatus } from '@prisma/client';

test.describe('Phase D Production Media Management & Storage E2E Flow', () => {
  const timestamp = Date.now();
  const editorUser = {
    name: 'E2E Media Editor',
    email: `e2e_media_editor_${timestamp}@example.com`,
    password: 'EditorPassword123!',
  };
  const adminUser = {
    name: 'E2E Media Admin',
    email: `e2e_media_admin_${timestamp}@example.com`,
    password: 'AdminPassword123!',
  };

  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  let createdCourseId: string | null = null;

  test.beforeAll(async () => {
    // 1. Seed Editor user
    const editorHash = await hashPassword(editorUser.password);
    await prisma.user.create({
      data: {
        name: editorUser.name,
        email: editorUser.email,
        passwordHash: editorHash,
        role: UserRole.CONTENT_EDITOR,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
        onboardingProfile: {
          create: {
            completed: true,
            experienceLevel: 'INTERMEDIATE',
            guitarType: 'ACOUSTIC',
            dailyGoalMinutes: 30,
          },
        },
      },
    });

    // 2. Seed Admin user
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
            experienceLevel: 'INTERMEDIATE',
            guitarType: 'ELECTRIC',
            dailyGoalMinutes: 45,
          },
        },
      },
    });
  });

  test.afterAll(async () => {
    // Clean up course
    if (createdCourseId) {
      await prisma.course.deleteMany({ where: { id: createdCourseId } }).catch(() => null);
    }

    // Clean up test users & any media assets / audit logs created by them
    const testUsers = await prisma.user.findMany({
      where: { email: { in: [editorUser.email, adminUser.email] } },
      select: { id: true },
    });
    const userIds = testUsers.map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.course.updateMany({
        where: { thumbnailAsset: { createdById: { in: userIds } } },
        data: { thumbnailAssetId: null },
      }).catch(() => null);

      await prisma.lessonSection.updateMany({
        where: { mediaAsset: { createdById: { in: userIds } } },
        data: { mediaAssetId: null },
      }).catch(() => null);

      await prisma.mediaAsset.deleteMany({
        where: { createdById: { in: userIds } },
      }).catch(() => null);

      await prisma.adminAuditLog.deleteMany({
        where: { actorUserId: { in: userIds } },
      }).catch(() => null);

      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      }).catch(() => null);
    }

    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('Flow 1: Content Editor uploads asset, selects via MediaPicker in Course CMS, and saves', async ({ page }) => {
    // Step 1: Login as CONTENT_EDITOR
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/email address/i).fill(editorUser.email);
    await page.getByLabel(/password/i).fill(editorUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard/);

    // Step 2: Open Media Library
    await page.goto('/admin/media');
    await expect(page.getByRole('heading', { name: /media library/i })).toBeVisible();

    // Step 3: Trigger Upload Modal
    await page.getByRole('button', { name: /upload media/i }).click();
    await expect(page.getByRole('heading', { name: /upload new/i })).toBeVisible();

    // Provide file through input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `guitar-e2e-${timestamp}.png`,
      mimeType: 'image/png',
      buffer: samplePngBuffer,
    });

    // Fill optional metadata
    await page.locator('input[placeholder*="chord diagram"]').fill('E2E Guitar Hero Image');

    // Click confirm upload
    await page.getByRole('button', { name: /upload & activate/i }).click();

    // Wait for upload to complete and modal to close
    await expect(page.getByRole('heading', { name: /upload new/i })).not.toBeVisible({ timeout: 15000 });

    // Verify uploaded file is visible in media table
    await expect(page.getByText(`guitar-e2e-${timestamp}.png`).first()).toBeVisible();

    // Step 4: Navigate to Course Creation
    await page.goto('/admin/courses/new');
    await expect(page.getByRole('heading', { name: /create course/i })).toBeVisible();

    // Fill course basics
    await page.locator('input[placeholder*="Acoustic Guitar Foundations"]').fill(`E2E Media Course ${timestamp}`);
    await page.locator('textarea').fill('A complete course built to verify media picker integration.');

    // Step 5: Open MediaPicker dialog
    await page.getByRole('button', { name: /select media/i }).click();
    await expect(page.getByRole('heading', { name: /choose media asset/i })).toBeVisible();

    // Locate the uploaded file item and click Select
    const assetCard = page.locator(`div:has-text("guitar-e2e-${timestamp}.png")`).last();
    await expect(assetCard).toBeVisible();
    await assetCard.click();

    // Confirm picker modal closes and preview appears
    await expect(page.getByRole('heading', { name: /choose media asset/i })).not.toBeVisible();
    await expect(page.getByText(`guitar-e2e-${timestamp}.png`).first()).toBeVisible();

    // Step 6: Submit course creation
    await page.getByRole('button', { name: /create course draft/i }).click();

    // Wait for redirect to Course Detail page
    await page.waitForURL(/\/admin\/courses\/[a-z0-9-]+/);
    await expect(page.getByRole('heading', { name: new RegExp(`E2E Media Course ${timestamp}`, 'i') })).toBeVisible();

    // Extract created course id from URL
    const url = page.url();
    const parts = url.split('/');
    createdCourseId = parts[parts.length - 1];

    // Verify thumbnail is retained in Course Detail form
    await expect(page.getByText(`guitar-e2e-${timestamp}.png`).first()).toBeVisible();
  });

  test('Flow 2: Reference-Safe Deletion blocks deleting in-use asset, allows delete after detach', async ({ page }) => {
    // Step 1: Login as ADMIN
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(adminUser.email);
    await page.getByLabel(/password/i).fill(adminUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Step 2: Open Media Library
    await page.goto('/admin/media');
    await expect(page.getByRole('heading', { name: /media library/i })).toBeVisible();

    // Step 3: Click on the attached asset to open Details Drawer
    const assetCard = page.locator(`div:has-text("guitar-e2e-${timestamp}.png")`).last();
    await expect(assetCard).toBeVisible();
    await assetCard.click();

    // Verify Details Drawer opened
    await expect(page.getByRole('heading', { name: /asset inspection/i })).toBeVisible();
    await expect(page.getByText(/1 place\(s\)/i)).toBeVisible();

    // Step 4: Attempt Delete -> Expect in-use protection alert
    await page.getByRole('button', { name: /delete safely/i }).click();

    // Expect conflict banner explaining asset is in use
    await expect(page.getByText(/cannot delete this asset because it is in use/i)).toBeVisible();

    // Close Details Drawer
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('heading', { name: /asset inspection/i })).not.toBeVisible();

    // Step 5: Detach asset from Course
    expect(createdCourseId).toBeDefined();
    await page.goto(`/admin/courses/${createdCourseId}`);
    await expect(page.getByRole('heading', { name: new RegExp(`E2E Media Course ${timestamp}`, 'i') })).toBeVisible();

    // Click remove button on MediaPicker
    await page.locator('button[title="Remove Attachment"]').click();
    // Save updated course
    await page.getByRole('button', { name: /save course/i }).click();
    await expect(page.getByText(/course updated successfully/i)).toBeVisible();

    // Step 6: Return to Media Library and Delete cleanly
    await page.goto('/admin/media');
    await expect(page.getByRole('heading', { name: /media library/i })).toBeVisible();

    const freedCard = page.locator(`div:has-text("guitar-e2e-${timestamp}.png")`).last();
    await freedCard.click();

    await expect(page.getByRole('heading', { name: /asset inspection/i })).toBeVisible();
    await expect(page.getByText(/0 place\(s\)/i)).toBeVisible();

    await page.getByRole('button', { name: /delete safely/i }).click();

    // Verify drawer closes
    await expect(page.getByRole('heading', { name: /asset inspection/i })).not.toBeVisible();
  });
});
