import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEV_CLASS_IDS, DEV_COURSE_IDS, DEV_USER_IDS } from '../../../scripts/seed/dev-users';

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

const devCourses = [
  {
    id: DEV_COURSE_IDS.general,
    name: 'Cours général',
    description: 'Cours par défaut pour les notes existantes',
  },
  {
    id: DEV_COURSE_IDS.maths,
    name: 'Mathématiques',
    description: 'Cours de démonstration — maths',
  },
  {
    id: DEV_COURSE_IDS.sciences,
    name: 'Sciences',
    description: 'Cours de démonstration — sciences',
  },
] as const;

/**
 * Utilisateurs grade-service (élèves avec notes uniquement).
 * `classId` = classe principale (CM2-A) ; aligné sur class-service :
 * - CM2-A : student + user (élèves)
 * - 6ème Sciences : student (élève) ; teacher + admin (profs, pas de notes ici)
 */
const devGradeUsers = [
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
] as const;

/** Notes uniquement pour les élèves inscrits (voir class-service/prisma/seed.ts). */
const devGrades = [
  {
    userId: DEV_USER_IDS.student,
    classId: DEV_CLASS_IDS.cm2a,
    courseId: DEV_COURSE_IDS.maths,
    value: 15.5,
  },
  {
    userId: DEV_USER_IDS.student,
    classId: DEV_CLASS_IDS.cm2a,
    courseId: DEV_COURSE_IDS.maths,
    value: 17,
  },
  {
    userId: DEV_USER_IDS.student,
    classId: DEV_CLASS_IDS.sciences6,
    courseId: DEV_COURSE_IDS.sciences,
    value: 16,
  },
  {
    userId: DEV_USER_IDS.user,
    classId: DEV_CLASS_IDS.cm2a,
    courseId: DEV_COURSE_IDS.sciences,
    value: 14,
  },
] as const;

const devGradeUserIds = [
  DEV_USER_IDS.student,
  DEV_USER_IDS.user,
  DEV_USER_IDS.teacher,
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

    for (const spec of devCourses) {
      await prisma.course.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, description: spec.description },
      });
    }

    await prisma.grade.deleteMany({
      where: {
        userId: { in: [...devGradeUserIds] },
      },
    });

    await prisma.user.deleteMany({
      where: { id: DEV_USER_IDS.teacher },
    });

    for (const spec of devGradeUsers) {
      await prisma.user.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, email: spec.email, classId: spec.classId },
      });
    }

    for (const spec of devGrades) {
      await prisma.grade.create({ data: spec });
    }

    console.log('Seed grade-service: dev classes, courses, users, and grades ready.');
    console.log('  • Aligné class-service : CM2-A (student, user) ; 6ème (student)');
    console.log(`  • ${devGrades.length} grades (élèves uniquement, pas de note prof)`);
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
