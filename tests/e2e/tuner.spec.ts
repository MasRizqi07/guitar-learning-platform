import { test, expect } from '@playwright/test';

test.describe('Guitar Utilities E2E: Tuner & Interactive Fretboard', () => {
  // Pre-authenticate user before testing protected app shell routes (/tuner, /library)
  test.beforeEach(async ({ page }) => {
    const timestamp = Date.now();
    const email = `tuner_e2e_${timestamp}@example.com`;

    await page.goto('/register');
    await page.getByLabel(/your name/i).fill('Tuner Tester');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/password/i).fill('password12345');
    await page.getByRole('button', { name: /create account/i }).click();

    // Fast-path through onboarding to complete profile setup
    await page.waitForURL(/\/onboarding/);
    await page.getByRole('button', { name: /get started/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /complete setup/i }).click();
    await page.getByRole('button', { name: /enter dashboard/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test('verifies Tuner UI, Reference Tones, Mode Switching, and Error Handling', async ({ page }) => {
    // 1. Visit Tuner page
    await page.goto('/tuner');
    await expect(page.getByRole('heading', { name: /guitar tuner/i })).toBeVisible();

    // Verify mode selector buttons exist
    const micTab = page.getByRole('button', { name: /mic tuner/i });
    const earTab = page.getByRole('button', { name: /by ear/i });
    await expect(micTab).toBeVisible();
    await expect(earTab).toBeVisible();

    // 2. Switch to "By Ear (Tones)"
    await earTab.click();
    await expect(page.getByRole('heading', { name: /acoustic reference tones/i })).toBeVisible();

    // Verify 6 standard tuning string cards are displayed
    await expect(page.getByText('String 6')).toBeVisible();
    await expect(page.getByText('String 5')).toBeVisible();
    await expect(page.getByText('String 4')).toBeVisible();
    await expect(page.getByText('String 3')).toBeVisible();
    await expect(page.getByText('String 2')).toBeVisible();
    await expect(page.getByText('String 1')).toBeVisible();

    // Click Pluck Tone button
    const pluckBtn = page.getByRole('button', { name: /pluck tone/i });
    await expect(pluckBtn).toBeVisible();
    await pluckBtn.click();

    // Toggle continuous loop
    const loopBtn = page.getByRole('button', { name: /continuous repeat/i });
    await expect(loopBtn).toBeVisible();
    await loopBtn.click();
    await expect(page.getByRole('button', { name: /stop repeat/i })).toBeVisible();
    await page.getByRole('button', { name: /stop repeat/i }).click();

    // 3. Switch back to "Mic Tuner"
    await micTab.click();
    const startListeningBtn = page.getByRole('button', { name: /start listening/i });
    await expect(startListeningBtn).toBeVisible();

    // In automated headless browser environment, microphone might be simulated or denied.
    // Ensure clicking Start Listening does not crash the app or throw unhandled exceptions.
    await startListeningBtn.click();
    await page.waitForTimeout(500);

    // Page must remain rendered and healthy
    await expect(page.getByRole('heading', { name: /guitar tuner/i })).toBeVisible();
  });

  test('verifies Interactive Fretboard & Scale Filters in Library', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: /chord library|interactive fretboard/i })).toBeVisible();

    // Switch to Fretboard mode
    const fretboardBtn = page.getByRole('button', { name: /fretboard/i });
    await expect(fretboardBtn).toBeVisible();
    await fretboardBtn.click();

    // Verify scale selector filters exist
    await expect(page.getByRole('button', { name: /a minor pentatonic/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /c major scale/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /a blues scale/i })).toBeVisible();

    // Click C Major Scale
    await page.getByRole('button', { name: /c major scale/i }).click();
    await expect(page.getByText(/the foundational standard major scale/i)).toBeVisible();

    // Verify fretboard neck is rendered with open strings and frets
    await expect(page.getByText(/open/i).first()).toBeVisible();
  });
});
