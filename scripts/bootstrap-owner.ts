import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { UserRole, AccountStatus, Prisma } from '@prisma/client';

async function bootstrapOwner() {
  const args = process.argv.slice(2);
  let email = process.env.INITIAL_OWNER_EMAIL || '';

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npm run admin:bootstrap-owner -- --email=<owner-email>

Options:
  --email=<email>       Email of user to promote or create as initial OWNER
  --password=<pass>     Password if creating a new user (defaults to INITIAL_OWNER_PASSWORD env or generated password)
  --name=<name>         Full name if creating a new user (defaults to "Platform Owner")
  --help, -h            Show this help message
`);
      process.exit(0);
    }
    if (arg.startsWith('--email=')) {
      email = arg.split('=')[1].trim().toLowerCase();
    } else if (arg === '--email' && args[args.indexOf(arg) + 1]) {
      email = args[args.indexOf(arg) + 1].trim().toLowerCase();
    }
  }

  if (!email) {
    console.error('Error: Please provide an owner email via --email=<email> or INITIAL_OWNER_EMAIL env variable.');
    process.exit(1);
  }

  console.log(`[Bootstrap] Checking user for email: ${email}`);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`[Bootstrap] Found existing user: ${existing.name} (${existing.id}) with role: ${existing.role}`);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: UserRole.OWNER,
        status: AccountStatus.ACTIVE,
        emailVerified: existing.emailVerified || new Date(),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: existing.id,
        action: 'BOOTSTRAP_OWNER_PROMOTION',
        entityType: 'User',
        entityId: existing.id,
        before: { role: existing.role, status: existing.status },
        after: { role: UserRole.OWNER, status: AccountStatus.ACTIVE },
        userAgent: 'CLI_BOOTSTRAP',
      },
    });

    console.log(`[Bootstrap] Successfully promoted user ${updated.email} to OWNER.`);
  } else {
    console.log(`[Bootstrap] User not found. Creating new initial OWNER account...`);
    const initialPassword = process.env.INITIAL_OWNER_PASSWORD || 'OwnerBootstrap2026!';
    const passwordHash = await hashPassword(initialPassword);

    const newUser = await prisma.user.create({
      data: {
        name: 'Initial Platform Owner',
        email,
        passwordHash,
        role: UserRole.OWNER,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
        profile: {
          create: {
            timezone: 'Asia/Jakarta',
            totalXP: 0,
            currentStreak: 0,
            longestStreak: 0,
            currentLevel: 1,
          },
        },
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorUserId: newUser.id,
        action: 'BOOTSTRAP_OWNER_CREATION',
        entityType: 'User',
        entityId: newUser.id,
        before: Prisma.JsonNull,
        after: { role: UserRole.OWNER, status: AccountStatus.ACTIVE, email },
        userAgent: 'CLI_BOOTSTRAP',
      },
    });

    console.log(`[Bootstrap] Successfully created initial OWNER account!`);
    console.log(`[Bootstrap] Email: ${newUser.email}`);
    if (!process.env.INITIAL_OWNER_PASSWORD) {
      console.log(`[Bootstrap] Generated Temporary Password: ${initialPassword}`);
      console.log(`[Bootstrap] WARNING: Please log in and change this password immediately via /settings/security.`);
    }
  }

  await prisma.$disconnect();
}

bootstrapOwner().catch(async (e) => {
  console.error('[Bootstrap] Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
