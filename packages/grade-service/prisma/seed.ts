import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEV_CLASS_IDS, DEV_USER_IDS } from '../../../scripts/seed/dev-users';

const devClasses = [
  {
    id: DEV_CLASS_IDS.cm2a,
    name: 'CM2-A',
    description: 'Classe de démonstration — primaire',
  },
  {
    id: DEV_CLASS_IDS.sciences6,
    name: '6ème Sciences',
    description: 'Classe de démonstration — collège',
  },
] as const;

const devUsers = [
  {
    id: DEV_USER_IDS.student,
    name: 'Dev Student',
    email: 'dev.student@skolr.local',
    classId: DEV_CLASS_IDS.cm2a,
  },
  {
    id: DEV_USER_IDS.user,
    name: 'Dev User',
    email: 'dev.user@skolr.local',
    classId: DEV_CLASS_IDS.cm2a,
  },
  {
    id: DEV_USER_IDS.teacher,
    name: 'Dev Teacher',
    email: 'dev.teacher@skolr.local',
    classId: DEV_CLASS_IDS.sciences6,
  },
] as const;

const devGrades = [
  { userId: DEV_USER_IDS.student, classId: DEV_CLASS_IDS.cm2a, value: 15.5 },
  { userId: DEV_USER_IDS.student, classId: DEV_CLASS_IDS.cm2a, value: 17 },
  { userId: DEV_USER_IDS.user, classId: DEV_CLASS_IDS.cm2a, value: 14 },
  { userId: DEV_USER_IDS.teacher, classId: DEV_CLASS_IDS.sciences6, value: 18 },
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const spec of devClasses) {
      await prisma.class.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, description: spec.description },
      });
    }

    for (const spec of devUsers) {
      await prisma.user.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, email: spec.email, classId: spec.classId },
      });
    }

    await prisma.grade.deleteMany({
      where: {
        userId: { in: devUsers.map((u) => u.id) },
      },
    });

    for (const spec of devGrades) {
      await prisma.grade.create({ data: spec });
    }

    console.log('Seed grade-service: dev classes, users, and grades ready.');
    console.log(`  • ${devGrades.length} grades for dev users`);
    console.log(
      '\nList grades: GET http://localhost:3007/grades (or via gateway GET http://localhost:3001/grade/grades)',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
