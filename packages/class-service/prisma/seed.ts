import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEV_CLASS_IDS, DEV_USER_IDS } from '../../../scripts/seed/dev-users';

const devClasses: Array<{
  id: string;
  name: string;
  description: string;
  teacherIds: string[];
  studentIds: string[];
}> = [
  {
    id: DEV_CLASS_IDS.cm2a,
    name: 'CM2-A',
    description: 'Classe de démonstration — primaire',
    teacherIds: [DEV_USER_IDS.teacher],
    studentIds: [DEV_USER_IDS.student, DEV_USER_IDS.user],
  },
  {
    id: DEV_CLASS_IDS.sciences6,
    name: '6ème Sciences',
    description: 'Classe de démonstration — collège',
    teacherIds: [DEV_USER_IDS.teacher, DEV_USER_IDS.admin],
    studentIds: [DEV_USER_IDS.student],
  },
];

async function seedClass(
  prisma: PrismaClient,
  spec: (typeof devClasses)[number],
) {
  await prisma.$transaction(async (tx) => {
    await tx.class.upsert({
      where: { id: spec.id },
      create: {
        id: spec.id,
        name: spec.name,
        description: spec.description,
      },
      update: {
        name: spec.name,
        description: spec.description,
      },
    });

    await tx.classTeacher.deleteMany({ where: { classId: spec.id } });
    await tx.classStudent.deleteMany({ where: { classId: spec.id } });

    for (let i = 0; i < spec.teacherIds.length; i++) {
      const teacherId = spec.teacherIds[i];
      await tx.classTeacher.create({
        data: {
          classId: spec.id,
          teacherId,
          isPrincipal: i === 0,
        },
      });
    }

    for (const studentId of spec.studentIds) {
      await tx.classStudent.create({
        data: {
          classId: spec.id,
          studentId,
        },
      });
    }
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    for (const spec of devClasses) {
      await seedClass(prisma, spec);
    }

    console.log('Seed class-service: dev classes ready.');
    for (const spec of devClasses) {
      console.log(
        `  • ${spec.name} (${spec.id}) — teachers: ${spec.teacherIds.join(', ')}`,
      );
    }
    console.log(
      '\nList classes: GET http://localhost:3002/classes (or via gateway when proxied)',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
