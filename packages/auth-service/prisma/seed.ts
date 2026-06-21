import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DEV_USER_IDS,
  DEV_TEACHERS,
  DEV_GENERATED_STUDENTS,
  DEV_TEACHER_PASSWORD,
  DEV_STUDENT_PASSWORD,
  DEV_ESTABLISHMENT,
  DEV_PLATFORM_ADMIN,
  DEV_PLATFORM_ADMIN_PASSWORD,
  DEV_PARENTS,
  DEV_PARENT_PASSWORD,
} from '../../../scripts/seed/dev-users';

/**
 * Local dev accounts only (idempotent upsert by email).
 * Plain passwords here — never use this pattern in production.
 */
const baseUsers: Array<{
  id: string;
  email: string;
  plainPassword: string;
  name: string;
  role: Role;
  establishmentId?: string;
}> = [
  {
    id: DEV_USER_IDS.admin,
    email: 'dev.admin@skolr.local',
    plainPassword: 'dev-admin-123',
    name: 'Dev Admin',
    role: Role.ADMIN,
    establishmentId: DEV_ESTABLISHMENT.id,
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
  {
    id: DEV_PLATFORM_ADMIN.id,
    email: DEV_PLATFORM_ADMIN.email,
    plainPassword: DEV_PLATFORM_ADMIN_PASSWORD,
    name: DEV_PLATFORM_ADMIN.name,
    role: Role.PLATFORM_ADMIN,
  },
];

const devUsers: typeof baseUsers = [
  ...baseUsers,
  ...DEV_TEACHERS.map((t) => ({
    id: t.id,
    email: t.email,
    plainPassword: DEV_TEACHER_PASSWORD,
    name: t.name,
    role: Role.TEACHER,
  })),
  ...DEV_GENERATED_STUDENTS.map((s) => ({
    id: s.id,
    email: s.email,
    plainPassword: DEV_STUDENT_PASSWORD,
    name: s.name,
    role: Role.USER,
  })),
  ...DEV_PARENTS.map((p) => ({
    id: p.id,
    email: p.email,
    plainPassword: DEV_PARENT_PASSWORD,
    name: p.name,
    role: Role.PARENT,
  })),
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
          establishmentId: u.establishmentId ?? null,
          oauthProvider: null,
          oauthId: null,
        },
        create: {
          id: u.id,
          email: u.email,
          password,
          name: u.name,
          role: u.role,
          establishmentId: u.establishmentId ?? null,
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
