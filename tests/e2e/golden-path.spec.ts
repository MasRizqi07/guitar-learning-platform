import { test, expect } from '@playwright/test';

test.describe('Real Browser Golden Path E2E Journey', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'E2E Guitarist',
    email: `guitarist_${timestamp}@example.com`,
    password: 'password12345',
  };

  test('completes full user lifecycle: register -> onboarding -> dashboard -> lesson -> quiz -> roadmap -> logout -> login', async ({ page }) => {
    // 1. Visit Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/Guitar Learning Platform/i);

    // 2. Navigate to Register
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();

    // Fill registration form
    await page.getByLabel(/your name/i).fill(testUser.name);
    await page.getByLabel(/email address/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /create account/i }).click();

    // 3. Onboarding Flow
    await page.waitForURL(/\/onboarding/);

    // Step 1: Welcome
    await page.getByRole('button', { name: /get started/i }).click();

    // Step 2: Learning Goals (default selected: LEARN_FROM_ZERO)
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3: Experience Level (default selected: ABSOLUTE_BEGINNER)
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 4: Guitar Type (default selected: ACOUSTIC)
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 5: Daily Commitment (for ABSOLUTE_BEGINNER, submits onboarding via Complete Setup)
    await page.getByRole('button', { name: /complete setup/i }).click();

    // Step 7: Placement Ready Screen
    await expect(page.getByText(/you're set for success!/i)).toBeVisible();
    await page.getByRole('button', { name: /enter dashboard/i }).click();

    // 4. Reach Dashboard
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: new RegExp(`welcome back, ${testUser.name}`, 'i') })).toBeVisible();

    // 5. Navigate to Learn (Roadmap)
    await page.goto('/learn');
    await expect(page.getByRole('heading', { name: /beginner guitar fundamentals/i })).toBeVisible();

    // Find and click Lesson 1
    const lesson1Link = page.locator('a[href="/lessons/intro-to-guitar"]');
    await expect(lesson1Link).toBeVisible();
    await lesson1Link.click();

    // 6. Lesson 1 Screen
    await page.waitForURL(/\/lessons\/intro-to-guitar/);
    await expect(page.getByRole('heading', { name: /introduction to guitar/i })).toBeVisible();

    // Traverse all sections
    while (await page.getByRole('button', { name: /next section/i }).isVisible()) {
      await page.getByRole('button', { name: /next section/i }).click();
      await page.waitForTimeout(200);
    }

    // Reach last section: Take Lesson Quiz button should appear
    const quizButton = page.getByRole('button', { name: /take lesson quiz/i });
    await expect(quizButton).toBeVisible();
    await quizButton.click();

    // 7. Quiz Screen
    await page.waitForURL(/\/quizzes\//);
    await expect(page.locator('h1')).toBeVisible();

    // Answer each question by clicking an option
    const questionsContainer = page.locator('.space-y-6');
    const questionCards = questionsContainer.locator('> div');
    const qCount = await questionCards.count();

    for (let i = 0; i < qCount; i++) {
      const qCard = questionCards.nth(i);
      const firstOption = qCard.locator('button').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    // Submit Quiz: "Submit Answers & Calculate Score"
    const submitBtn = page.getByRole('button', { name: /submit answers/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify Quiz Results appear
    await expect(page.getByText(/quiz passed!|needs more practice/i)).toBeVisible({ timeout: 10000 });

    // Click Continue to Roadmap
    const continueBtn = page.getByRole('button', { name: /continue to roadmap/i });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await page.waitForURL(/\/learn/);
    }

    // 8. Test Logout via sidebar button
    const logoutBtn = page.getByRole('button', { name: /sign out/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await page.waitForURL(/\/login/);

    // 9. Test Re-login with persistence
    await page.getByLabel(/email address/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: new RegExp(`welcome back, ${testUser.name}`, 'i') })).toBeVisible();
  });
});
