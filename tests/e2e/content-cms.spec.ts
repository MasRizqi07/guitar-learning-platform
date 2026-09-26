import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth';
import { UserRole, AccountStatus } from '@prisma/client';

test.describe('Phase C Content Management System (CMS) E2E Flow', () => {
  const timestamp = Date.now();
  const editorUser = {
    name: 'E2E Content Editor',
    email: `e2e_editor_${timestamp}@example.com`,
    password: 'EditorPassword123!',
  };
  const adminUser = {
    name: 'E2E CMS Admin',
    email: `e2e_admin_${timestamp}@example.com`,
    password: 'AdminPassword123!',
  };
  const learnerUser = {
    name: 'E2E CMS Learner',
    email: `e2e_learner_${timestamp}@example.com`,
    password: 'LearnerPassword123!',
  };

  let testCourseId: string;
  let testModuleId: string;
  let createdLessonId: string;
  const testLessonSlug = `e2e-lesson-${timestamp}`;

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
            dailyGoalMinutes: 30,
          },
        },
      },
    });

    // 3. Seed Learner user
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

    // 4. Seed base published Course and Module for testing lesson creation
    const course = await prisma.course.create({
      data: {
        title: `E2E CMS Test Course ${timestamp}`,
        slug: `e2e-cms-course-${timestamp}`,
        description: 'Course created for Phase C E2E testing',
        difficulty: 'BEGINNER',
        order: 9900 + Math.floor(Math.random() * 500),
        status: 'PUBLISHED',
        published: true,
        modules: {
          create: {
            title: `E2E CMS Test Module ${timestamp}`,
            slug: `e2e-cms-module-${timestamp}`,
            description: 'Module for testing CMS workflows',
            order: 1,
            status: 'PUBLISHED',
          },
        },
      },
      include: {
        modules: true,
      },
    });

    testCourseId = course.id;
    testModuleId = course.modules[0].id;
  });

  test.afterAll(async () => {
    // Teardown created entities safely
    if (createdLessonId) {
      await prisma.quizAttemptAnswer.deleteMany({
        where: { question: { quiz: { lessonId: createdLessonId } } },
      }).catch(() => null);
      await prisma.quizAttempt.deleteMany({
        where: { quiz: { lessonId: createdLessonId } },
      }).catch(() => null);
      await prisma.lessonRevision.deleteMany({
        where: { lessonId: createdLessonId },
      }).catch(() => null);
    }
    if (testCourseId) {
      await prisma.course.deleteMany({
        where: { id: testCourseId },
      }).catch(() => null);
    }
    await prisma.user.deleteMany({
      where: {
        email: { in: [editorUser.email, adminUser.email, learnerUser.email] },
      },
    }).catch(() => null);

    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('Critical CMS Flow: Editor drafts lesson, adds section, submits review -> Admin publishes -> Learner views content', async ({ page }) => {
    // -------------------------------------------------------------
    // STEP 1: CONTENT_EDITOR logs in and opens Content Overview
    // -------------------------------------------------------------
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/email address/i).fill(editorUser.email);
    await page.getByLabel(/password/i).fill(editorUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard/);

    // Navigate to Admin Content Overview
    await page.goto('/admin/content');
    await expect(page.getByRole('heading', { name: /curriculum management/i })).toBeVisible();
    await expect(page.getByText(/draft lessons/i)).toBeVisible();

    // -------------------------------------------------------------
    // STEP 2: CONTENT_EDITOR creates new Lesson Draft
    // -------------------------------------------------------------
    await page.goto(`/admin/lessons/new?moduleId=${testModuleId}`);
    await expect(page.getByRole('heading', { name: /create lesson/i })).toBeVisible();

    // Fill form
    await page.getByPlaceholder(/clean chords/i).fill(`E2E Fingerpicking Intro ${timestamp}`);
    // Clear and fill custom unique slug
    const slugInput = page.getByPlaceholder(/ringing-out-clean-chords/i);
    await slugInput.fill(testLessonSlug);

    await page.getByPlaceholder(/brief overview/i).fill('E2E Lesson Description for publishing flow');

    // Click Save & Edit Sections
    await page.getByRole('button', { name: /save & edit sections/i }).click();

    // Wait to navigate to lesson editor (UUID pattern)
    await page.waitForURL(/\/admin\/lessons\/[0-9a-f-]{20,}/);
    const url = page.url();
    createdLessonId = url.split('/admin/lessons/')[1].split('/')[0].split('?')[0];
    expect(createdLessonId).toBeTruthy();
    expect(createdLessonId).not.toBe('new');

    await expect(page.locator('span', { hasText: /^DRAFT$/i })).toBeVisible();

    // -------------------------------------------------------------
    // STEP 3: Add a required Lesson Section
    // -------------------------------------------------------------
    await page.getByRole('button', { name: /add section/i }).click();

    // Section modal opens
    await expect(page.getByRole('heading', { name: /add new section/i })).toBeVisible();
    await page.getByPlaceholder(/e\.g\. finger placement guide/i).fill('Acoustic Picking Fundamentals');
    await page.getByPlaceholder(/detailed instructional content for this step/i).fill('Welcome to the authoritative guitar picking guide for beginners.');

    await page.getByRole('button', { name: /save section/i }).click();

    // Section should now be rendered in the sections list
    await expect(page.getByText('Acoustic Picking Fundamentals')).toBeVisible();

    // -------------------------------------------------------------
    // STEP 4: Staff Preview Mode
    // -------------------------------------------------------------
    const previewLink = page.getByRole('link', { name: /preview/i });
    await previewLink.click();

    // Verify staff preview banner and content
    await expect(page.getByText(/staff preview mode/i)).toBeVisible();
    await expect(page.getByText('Welcome to the authoritative guitar picking guide for beginners.')).toBeVisible();

    // Return to lesson editor
    await page.goto(`/admin/lessons/${createdLessonId}`);

    // -------------------------------------------------------------
    // STEP 5: Submit for Review & Verify Self-Approval Policy
    // -------------------------------------------------------------
    const submitBtn = page.getByRole('button', { name: /submit review/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Status transitions to IN_REVIEW
    await expect(page.locator('span', { hasText: /^IN_REVIEW$/i })).toBeVisible();

    // Attempting to publish as CONTENT_EDITOR must be blocked by self-approval policy
    const publishBtn = page.getByRole('button', { name: /approve & publish/i });
    if (await publishBtn.isVisible()) {
      await publishBtn.click();
      await expect(page.getByText(/permission denied|cannot publish|failed/i)).toBeVisible();
    }

    // -------------------------------------------------------------
    // STEP 6: Logout Editor
    // -------------------------------------------------------------
    await page.context().clearCookies();
    await page.goto('/login');

    // -------------------------------------------------------------
    // STEP 7: ADMIN logs in, reviews, and publishes
    // -------------------------------------------------------------
    await page.getByLabel(/email address/i).fill(adminUser.email);
    await page.getByLabel(/password/i).fill(adminUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Open the review lesson in CMS
    await page.goto(`/admin/lessons/${createdLessonId}`);
    await expect(page.locator('span', { hasText: /^IN_REVIEW$/i })).toBeVisible();

    // Admin approves & publishes
    const adminPublishBtn = page.getByRole('button', { name: /approve & publish/i });
    await expect(adminPublishBtn).toBeVisible();
    await adminPublishBtn.click();

    // Status updates to PUBLISHED
    await expect(page.locator('span', { hasText: /^PUBLISHED$/i })).toBeVisible();
    await expect(page.getByText(/lesson successfully published|lesson published/i)).toBeVisible();

    // -------------------------------------------------------------
    // STEP 8: Logout Admin
    // -------------------------------------------------------------
    await page.context().clearCookies();
    await page.goto('/login');

    // -------------------------------------------------------------
    // STEP 9: LEARNER logs in and accesses the published lesson
    // -------------------------------------------------------------
    await page.getByLabel(/email address/i).fill(learnerUser.email);
    await page.getByLabel(/password/i).fill(learnerUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Learner visits the published lesson directly by slug
    await page.goto(`/lessons/${testLessonSlug}`);
    await expect(page.getByRole('heading', { name: new RegExp(`E2E Fingerpicking Intro ${timestamp}`, 'i') })).toBeVisible();
    await expect(page.getByText('Welcome to the authoritative guitar picking guide for beginners.')).toBeVisible();
  });

  test('Revision Flow: Admin updates published lesson, generates revision, restores revision resetting to DRAFT', async ({ page }) => {
    // 1. ADMIN logs in
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(adminUser.email);
    await page.getByLabel(/password/i).fill(adminUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // 2. Open published lesson
    await page.goto(`/admin/lessons/${createdLessonId}`);
    await expect(page.locator('span', { hasText: /^PUBLISHED$/i })).toBeVisible();

    // 3. Update description
    const descTextarea = page.locator('form textarea');
    await descTextarea.fill('Revision 2 updated description');

    await page.getByRole('button', { name: /save lesson metadata/i }).click();
    await expect(page.getByText(/lesson metadata saved successfully|lesson updated/i)).toBeVisible();

    // 4. Check Revisions page
    await page.goto(`/admin/lessons/${createdLessonId}/revisions`);
    await expect(page.getByRole('heading', { name: /revision history/i })).toBeVisible();
    await expect(page.getByText('v1')).toBeVisible();

    // 5. Accept confirm dialog and restore v1
    page.on('dialog', (dialog) => dialog.accept());
    const restoreBtn = page.getByRole('button', { name: /restore/i }).first();
    await restoreBtn.click();

    // Verify feedback message
    await expect(page.getByText(/restored successfully as DRAFT/i)).toBeVisible();

    // 6. Return to lesson editor and verify status is DRAFT
    await page.goto(`/admin/lessons/${createdLessonId}`);
    await expect(page.locator('span', { hasText: /^DRAFT$/i })).toBeVisible();
  });
});
