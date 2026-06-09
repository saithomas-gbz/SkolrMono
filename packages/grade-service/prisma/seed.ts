import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DEV_CLASSES,
  DEV_COURSES,
  DEV_STUDENTS,
  DEV_SUBJECTS,
  DEV_TOPICS,
  DEV_USER_IDS,
} from '../../../scripts/seed/dev-users';

const devClasses = DEV_CLASSES;
const devCourses = DEV_COURSES;

const devGradeUsers = DEV_STUDENTS.map((s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  classId: s.classId,
}));

const CLASS_CM2A = DEV_CLASSES[0]!.id;
const CLASS_6EME = DEV_CLASSES[1]!.id;
const COURSE_MATHS = DEV_COURSES[0]!.id;
const COURSE_SCIENCES = DEV_COURSES[1]!.id;
const COURSE_FRANCAIS = DEV_COURSES[2]!.id;
const COURSE_HISTOIRE = DEV_COURSES[3]!.id;
const TEACHER_ID = DEV_USER_IDS.teacher;

const DEV_ASSIGNMENT_IDS = {
  cm2a_maths_ctrl1: 'EEEE0001-EEEE-EEEE-EEEE-000000000001',
  cm2a_maths_ctrl2: 'EEEE0001-EEEE-EEEE-EEEE-000000000002',
  cm2a_francais_dict: 'EEEE0001-EEEE-EEEE-EEEE-000000000003',
  sci6_sciences_tp1: 'EEEE0002-EEEE-EEEE-EEEE-000000000004',
  sci6_histoire_ctrl: 'EEEE0002-EEEE-EEEE-EEEE-000000000005',
  cm2a_maths_draft: 'EEEE0001-EEEE-EEEE-EEEE-000000000006',
} as const;

const devAssignments = [
  {
    id: DEV_ASSIGNMENT_IDS.cm2a_maths_ctrl1,
    title: 'Contrôle chapitre 1 — Fractions',
    classId: CLASS_CM2A,
    courseId: COURSE_MATHS,
    teacherId: TEACHER_ID,
    assignedAt: new Date('2026-05-15T08:00:00Z'),
    maxScore: 20,
    coefficient: 1,
    status: 'CLOSED' as const,
  },
  {
    id: DEV_ASSIGNMENT_IDS.cm2a_maths_ctrl2,
    title: 'Contrôle chapitre 2 — Géométrie',
    classId: CLASS_CM2A,
    courseId: COURSE_MATHS,
    teacherId: TEACHER_ID,
    assignedAt: new Date('2026-06-01T08:00:00Z'),
    maxScore: 20,
    coefficient: 2,
    status: 'PUBLISHED' as const,
  },
  {
    id: DEV_ASSIGNMENT_IDS.cm2a_francais_dict,
    title: 'Dictée n°3',
    classId: CLASS_CM2A,
    courseId: COURSE_FRANCAIS,
    teacherId: TEACHER_ID,
    assignedAt: new Date('2026-06-05T10:00:00Z'),
    maxScore: 10,
    coefficient: 1,
    status: 'PUBLISHED' as const,
  },
  {
    id: DEV_ASSIGNMENT_IDS.sci6_sciences_tp1,
    title: 'TP — Observation au microscope',
    classId: CLASS_6EME,
    courseId: COURSE_SCIENCES,
    teacherId: TEACHER_ID,
    assignedAt: new Date('2026-05-20T14:00:00Z'),
    maxScore: 20,
    coefficient: 1,
    status: 'CLOSED' as const,
  },
  {
    id: DEV_ASSIGNMENT_IDS.sci6_histoire_ctrl,
    title: 'Contrôle — Préhistoire',
    classId: CLASS_6EME,
    courseId: COURSE_HISTOIRE,
    teacherId: TEACHER_ID,
    assignedAt: new Date('2026-06-08T09:00:00Z'),
    maxScore: 20,
    coefficient: 1,
    status: 'PUBLISHED' as const,
  },
  {
    id: DEV_ASSIGNMENT_IDS.cm2a_maths_draft,
    title: 'Contrôle chapitre 3 — Brouillon',
    classId: CLASS_CM2A,
    courseId: COURSE_MATHS,
    teacherId: TEACHER_ID,
    assignedAt: new Date('2026-06-20T08:00:00Z'),
    maxScore: 20,
    coefficient: 1,
    status: 'DRAFT' as const,
  },
];

function gradeStatusForIndex(i: number): 'GRADED' | 'ABSENT' | 'PENDING' {
  if (i % 7 === 0) return 'ABSENT';
  if (i % 5 === 0) return 'PENDING';
  return 'GRADED';
}

function gradeValueForIndex(i: number, maxScore: number): number {
  return Math.min(maxScore, Math.max(0, Number((maxScore * 0.4 + ((i * 3 + 7) % (maxScore * 0.6 + 1))).toFixed(1))));
}

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

    for (const spec of DEV_TOPICS) {
      await prisma.topic.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, description: spec.description },
      });
    }

    // Link Maths ↔ Sciences as related courses
    const [mathsCourse, sciencesCourse] = devCourses;
    if (mathsCourse && sciencesCourse) {
      await prisma.course.update({
        where: { id: mathsCourse.id },
        data: { relatedCourses: { connect: { id: sciencesCourse.id } } },
      });
    }

    // Upsert students
    await prisma.user.deleteMany({ where: { id: DEV_USER_IDS.teacher } });
    for (const spec of devGradeUsers) {
      await prisma.user.upsert({
        where: { id: spec.id },
        create: spec,
        update: { name: spec.name, email: spec.email, classId: spec.classId },
      });
    }

    // Upsert assignments
    await prisma.grade.deleteMany({
      where: { assignmentId: { in: Object.values(DEV_ASSIGNMENT_IDS) } },
    });
    for (const spec of devAssignments) {
      await prisma.assignment.upsert({
        where: { id: spec.id },
        create: spec,
        update: { title: spec.title, status: spec.status, assignedAt: spec.assignedAt },
      });
    }

    // Create grades for published/closed assignments
    const publishedAssignments = devAssignments.filter((a) => a.status !== 'DRAFT');
    let gradeCount = 0;
    for (const assignment of publishedAssignments) {
      const students = devGradeUsers.filter((u) => u.classId === assignment.classId);
      for (let i = 0; i < students.length; i++) {
        const student = students[i]!;
        const status = gradeStatusForIndex(i);
        const value = status === 'GRADED' ? gradeValueForIndex(i, assignment.maxScore) : null;
        await prisma.grade.upsert({
          where: { assignmentId_userId: { assignmentId: assignment.id, userId: student.id } },
          create: {
            assignmentId: assignment.id,
            userId: student.id,
            classId: assignment.classId,
            courseId: assignment.courseId,
            status,
            value,
          },
          update: { status, value },
        });
        gradeCount++;
      }
    }

    console.log('Seed grade-service: dev classes, subjects, courses, topics, users, assignments and grades ready.');
    console.log(
      `  • ${DEV_SUBJECTS.length} matières, ${devCourses.length} cours, ${DEV_TOPICS.length} sujets, ${devGradeUsers.length} élèves`,
    );
    console.log(
      `  • ${devAssignments.length} devoirs (${publishedAssignments.length} publiés/clôturés, 1 brouillon), ${gradeCount} notes`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
