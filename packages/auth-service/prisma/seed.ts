import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEV_USER_IDS } from '../../../scripts/seed/dev-users';

/**
 * Local dev accounts only (idempotent upsert by email).
 * Plain passwords here — never use this pattern in production.
 */
const devUsers: Array<{
  id: string;
  email: string;
  plainPassword: string;
  name: string;
  role: Role;
}> = [
  {
    id: DEV_USER_IDS.admin,
    email: 'dev.admin@skolr.local',
    plainPassword: 'dev-admin-123',
    name: 'Dev Admin',
    role: Role.ADMIN,
  },
  {
    id: DEV_USER_IDS.user,
    email: 'dev.user@skolr.local',
    plainPassword: 'dev-user-123',
    name: 'Dev User',
    role: Role.USER,
  },
  {
    id: DEV_USER_IDS.teacher,
    email: 'dev.teacher@skolr.local',
    plainPassword: 'dev-teacher-123',
    name: 'Dev Teacher',
    role: Role.TEACHER,
  },
  {
    id: DEV_USER_IDS.student,
    email: 'dev.student@skolr.local',
    plainPassword: 'dev-student-123',
    name: 'Dev Student',
    role: Role.USER,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const u of devUsers) {
      const password = await bcrypt.hash(u.plainPassword, 10);
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          password,
          name: u.name,
          role: u.role,
          oauthProvider: null,
          oauthId: null,
        },
        create: {
          id: u.id,
          email: u.email,
          password,
          name: u.name,
          role: u.role,
        },
      });
    }

    console.log('Seed auth-service: dev users ready.');
    for (const u of devUsers) {
      console.log(`  • ${u.email} (${u.role}) id=${u.id} — password: ${u.plainPassword}`);
    }
    console.log(
      '\nLogin via gateway: POST http://localhost:3001/auth/login\n' +
        '  JSON body: { "email": "...", "password": "..." }',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
