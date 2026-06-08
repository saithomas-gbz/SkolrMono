import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DEV_CLASSES,
  DEV_COURSES,
  DEV_STUDENTS,
  DEV_SUBJECTS,
  DEV_USER_IDS,
} from '../../../scripts/seed/dev-users';

const devClasses = DEV_CLASSES;
const devCourses = DEV_COURSES;

/**
 * Utilisateurs grade-service : tous les élèves inscrits (aligné class-service).
 * `classId` = la classe de l'élève (contrainte grade-service : 1 élève → 1 classe).
 */
const devGradeUsers = DEV_STUDENTS.map((s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  classId: s.classId,
}));

/**
 * Notes déterministes : 2 notes par élève, sur 2 cours, dans la classe de l'élève.
 * Valeurs reproductibles (pas d'aléatoire) pour des seeds idempotents.
 */
const devGrades = devGradeUsers.flatMap((student, i) =>
  [0, 1].map((k) => {
    const course = devCourses[(i + k) % devCourses.length]!;
    const raw = 8 + ((i * 3 + k * 7) % 12) + (k === 0 ? 0 : 0.5);
    const value = Math.min(20, Math.max(0, Number(raw.toFixed(1))));
    return {
      userId: student.id,
      classId: student.classId,
      courseId: course.id,
      value,
    };
  }),
);

const devGradeUserIds = [...devGradeUsers.map((u) => u.id), DEV_USER_IDS.teacher];

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

    for (const spec of DEV_SUBJECTS) {
      await prisma.subject.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, description: spec.description },
      });
    }

    for (const spec of devCourses) {
      await prisma.course.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, description: spec.description, subjectId: spec.subjectId },
      });
    }

    // Link Maths ↔ Sciences as related courses (bidirectional via connect)
    const [mathsCourse, sciencesCourse] = devCourses;
    if (mathsCourse && sciencesCourse) {
      await prisma.course.update({
        where: { id: mathsCourse.id },
        data: { relatedCourses: { connect: { id: sciencesCourse.id } } },
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

    console.log('Seed grade-service: dev classes, subjects, courses, users, and grades ready.');
    console.log(
      `  • ${DEV_SUBJECTS.length} matières, ${devCourses.length} cours, ${devGradeUsers.length} élèves, ${devGrades.length} notes`,
    );
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
