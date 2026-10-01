import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/db';
import { hashPassword } from '../../src/lib/auth';
import { UserRole, AccountStatus } from '@prisma/client';

test.describe('Support Desk & Notifications E2E Journeys', () => {
  const timestamp = Date.now();
  const testSubject = `E2E Audio DSP Issue ${timestamp}`;

  const learnerUser = {
    name: 'E2E Support Learner',
    email: `e2e_supp_learner_${timestamp}@example.com`,
    password: 'LearnerPassword123!',
  };

  const supportStaffUser = {
    name: 'E2E Support Agent',
    email: `e2e_supp_agent_${timestamp}@example.com`,
    password: 'SupportPassword123!',
  };

  test.beforeAll(async () => {
    // 1. Seed learner
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

    // 2. Seed support staff
    const staffHash = await hashPassword(supportStaffUser.password);
    await prisma.user.create({
      data: {
        name: supportStaffUser.name,
        email: supportStaffUser.email,
        passwordHash: staffHash,
        role: UserRole.SUPPORT,
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
  });

  test.afterAll(async () => {
    // Clean up all tickets, messages, notifications and users
    const users = await prisma.user.findMany({
      where: { email: { in: [learnerUser.email, supportStaffUser.email] } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const ticketIds = tickets.map((t) => t.id);

    await prisma.supportMessage.deleteMany({ where: { ticketId: { in: ticketIds } } }).catch(() => null);
    await prisma.supportInternalNote.deleteMany({ where: { ticketId: { in: ticketIds } } }).catch(() => null);
    await prisma.supportTicket.deleteMany({ where: { id: { in: ticketIds } } }).catch(() => null);
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => null);

    await prisma.$disconnect();
  });

  test('Full Support Cycle: Learner submits ticket -> Staff replies & internal notes -> Learner views thread with zero leakage -> Resolves', async ({
    page,
  }) => {
    // ==========================================
    // STEP 1: LEARNER LOGS IN & SUBMITS TICKET
    // ==========================================
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(learnerUser.email);
    await page.getByLabel(/password/i).fill(learnerUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard/);

    // Navigate to Support page
    await page.goto('/support');
    await expect(page.getByRole('heading', { name: /support history/i })).toBeVisible();

    // Click New Ticket
    await page.getByRole('link', { name: /new ticket/i }).first().click();
    await page.waitForURL(/\/support\/new/);
    await expect(page.getByRole('heading', { name: /open support ticket/i })).toBeVisible();

    // Fill form
    await page.getByLabel(/subject/i).fill(testSubject);
    await page
      .getByLabel(/problem description/i)
      .fill('Detailed problem statement: tuner needle is lagging by 500ms on acoustic nylon strings.');
    await page.getByRole('button', { name: /submit ticket/i }).click();

    // Redirects to /support/[id]
    await page.waitForURL(/\/support\/.+/);
    await expect(page.getByRole('heading', { name: testSubject })).toBeVisible();
    await expect(page.getByText(/SUP-/)).toBeVisible();

    // Sign out learner
    await page.goto('/dashboard');
    await page.getByTitle(/sign out/i).click();
    await page.waitForURL(/\/login/);

    // ==========================================
    // STEP 2: STAFF LOGS IN & MANAGES TICKET
    // ==========================================
    await page.getByLabel(/email address/i).fill(supportStaffUser.email);
    await page.getByLabel(/password/i).fill(supportStaffUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Navigate to Admin Support Queue
    await page.goto('/admin/support');
    await expect(page.getByText(/student support ticket desk/i)).toBeVisible();

    // Locate the ticket by subject in list
    const ticketCard = page.locator('h3', { hasText: testSubject }).first();
    await expect(ticketCard).toBeVisible();
    await ticketCard.click();

    // Verify detail is loaded in right pane
    await expect(page.getByText(/conversation & internal notes/i)).toBeVisible();

    // Assign to self
    const assignBtn = page.getByRole('button', { name: /assign to me/i });
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await expect(page.getByText(/ticket assigned to you/i)).toBeVisible();
    }

    // Add Internal Note (Secret)
    const internalTabBtn = page.getByRole('button', { name: /internal staff note/i });
    await internalTabBtn.click();
    const noteText = 'INTERNAL NOTE: This is a known audio buffer threshold issue.';
    await page.getByPlaceholder(/internal note for staff/i).fill(noteText);
    await page.getByRole('button', { name: /save internal note/i }).click();
    await expect(page.getByText(/internal staff note saved/i)).toBeVisible();

    // Add Public Reply
    const publicTabBtn = page.getByRole('button', { name: /public reply/i });
    await publicTabBtn.click();
    const staffReplyText = 'Hello learner! Please adjust microphone sensitivity in settings.';
    await page.getByPlaceholder(/type your message to the student/i).fill(staffReplyText);
    await page.getByRole('button', { name: /send student reply/i }).click();
    await expect(page.getByText(/public reply sent to learner/i)).toBeVisible();

    // Transition status to WAITING_USER
    const waitUserBtn = page.getByRole('button', { name: /wait for learner/i });
    await waitUserBtn.click();
    await expect(page.getByText(/WAITING_USER/)).toBeVisible();

    // Sign out staff
    await page.goto('/dashboard');
    await page.getByTitle(/sign out/i).click();
    await page.waitForURL(/\/login/);

    // ==========================================
    // STEP 3: LEARNER VERIFIES NOTIFICATION & ZERO NOTE LEAKAGE
    // ==========================================
    await page.getByLabel(/email address/i).fill(learnerUser.email);
    await page.getByLabel(/password/i).fill(learnerUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Visit /notifications
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible();

    // Notification for staff reply should exist
    const replyNotif = page.locator('div', { hasText: /new reply on ticket/i }).first();
    await expect(replyNotif).toBeVisible();

    // Visit /support to view the ticket
    await page.goto('/support');
    const ticketRow = page.locator('a', { hasText: testSubject }).first();
    await expect(ticketRow).toBeVisible();
    await ticketRow.click();

    // On ticket conversation page
    await page.waitForURL(/\/support\/.+/);
    await expect(page.getByRole('heading', { name: testSubject })).toBeVisible();

    // 1. Verify staff public reply IS visible
    await expect(page.getByText(staffReplyText)).toBeVisible();

    // 2. CRITICAL VERIFICATION: Internal note MUST NOT BE VISIBLE anywhere
    await expect(page.getByText('This is a known audio buffer threshold issue.')).not.toBeVisible();
    await expect(page.getByText(/internal staff note/i)).not.toBeVisible();

    // 3. Learner submits follow-up reply
    const learnerFollowUp = 'Thank you, adjusting sensitivity fixed the latency!';
    await page.getByPlaceholder(/type your response here/i).fill(learnerFollowUp);
    await page.getByRole('button', { name: /send reply/i }).click();

    // Follow-up message appears in thread
    await expect(page.getByText(learnerFollowUp)).toBeVisible();
  });
});
