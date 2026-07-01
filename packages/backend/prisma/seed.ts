import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client';
import { mapStripeStatus } from '../src/modules/billing/lib/stripeStatusMapping';
import { LocalDiskStorageProvider } from '../src/modules/planning/lib/storage/localDiskStorageProvider';
import {
  DEV_CLASSES,
  DEV_COURSES,
  DEV_ESTABLISHMENT,
  DEV_GENERATED_STUDENTS,
  DEV_PARENTS,
  DEV_PARENT_PASSWORD,
  DEV_PLATFORM_ADMIN,
  DEV_PLATFORM_ADMIN_PASSWORD,
  DEV_STUDENTS,
  DEV_STUDENT_PASSWORD,
  DEV_SUBJECTS,
  DEV_TEACHERS,
  DEV_TEACHER_PASSWORD,
  DEV_TOPICS,
  DEV_USER_IDS,
  courseIdsForTeacherInClass,
  studentIdsForClass,
  teacherIdsForClass,
} from '../../../scripts/seed/dev-users';

/**
 * Seed consolidé du monolithe modulaire (#114). Remplace les 7 seeds par service
 * (auth, billing, class, grade, planning, message, parent) qui écrivaient chacun
 * dans leur base : ici, un seul PrismaClient écrit dans la base unique multi-schema.
 * Les fixtures de dev restent la source de vérité partagée (scripts/seed/dev-users).
 *
 * Idempotent (upsert par id/email). Les mots de passe sont en clair dans les
 * fixtures dev — ne jamais reproduire ce schéma en production.
 */

const DEV_ADMIN_EMAIL = 'dev.admin@skolr.local';

// ── auth ─────────────────────────────────────────────────────────────────────

async function seedAuth(prisma: PrismaClient) {
  const baseUsers: Array<{
    id: string;
    email: string;
    plainPassword: string;
    name: string;
    role: Role;
    establishmentId?: string;
  }> = [
    { id: DEV_USER_IDS.admin, email: DEV_ADMIN_EMAIL, plainPassword: 'dev-admin-123', name: 'Dev Admin', role: Role.ADMIN, establishmentId: DEV_ESTABLISHMENT.id },
    { id: DEV_USER_IDS.user, email: 'dev.user@skolr.local', plainPassword: 'dev-user-123', name: 'Dev User', role: Role.USER },
    { id: DEV_USER_IDS.teacher, email: 'dev.teacher@skolr.local', plainPassword: 'dev-teacher-123', name: 'Dev Teacher', role: Role.TEACHER },
    { id: DEV_USER_IDS.student, email: 'dev.student@skolr.local', plainPassword: 'dev-student-123', name: 'Dev Student', role: Role.USER },
    { id: DEV_PLATFORM_ADMIN.id, email: DEV_PLATFORM_ADMIN.email, plainPassword: DEV_PLATFORM_ADMIN_PASSWORD, name: DEV_PLATFORM_ADMIN.name, role: Role.PLATFORM_ADMIN },
  ];

  const devUsers: typeof baseUsers = [
    ...baseUsers,
    ...DEV_TEACHERS.map((t) => ({ id: t.id, email: t.email, plainPassword: DEV_TEACHER_PASSWORD, name: t.name, role: Role.TEACHER })),
    ...DEV_GENERATED_STUDENTS.map((s) => ({ id: s.id, email: s.email, plainPassword: DEV_STUDENT_PASSWORD, name: s.name, role: Role.USER })),
    ...DEV_PARENTS.map((p) => ({ id: p.id, email: p.email, plainPassword: DEV_PARENT_PASSWORD, name: p.name, role: Role.PARENT })),
  ];

  for (const u of devUsers) {
    const password = await bcrypt.hash(u.plainPassword, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password, name: u.name, role: u.role, establishmentId: u.establishmentId ?? null, oauthProvider: null, oauthId: null },
      create: { id: u.id, email: u.email, password, name: u.name, role: u.role, establishmentId: u.establishmentId ?? null },
    });
  }

  console.log(`[auth] ${devUsers.length} comptes de dev prêts (admin/user/teacher/student + profs + élèves + parents).`);
}

// ── billing ──────────────────────────────────────────────────────────────────

async function seedBilling(prisma: PrismaClient) {
  let stripeCustomerId = 'cus_seed_demo';
  let stripeSubscriptionId: string | null = null;
  let status: ReturnType<typeof mapStripeStatus> = 'ACTIVE';

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const customer = await stripe.customers.create({ email: DEV_ADMIN_EMAIL, name: DEV_ESTABLISHMENT.name });
      stripeCustomerId = customer.id;

      if (process.env.STRIPE_PRICE_STARTER) {
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: process.env.STRIPE_PRICE_STARTER }],
          payment_behavior: 'default_incomplete',
        });
        stripeSubscriptionId = subscription.id;
        status = mapStripeStatus(subscription.status);
      }
    } catch (err) {
      console.warn('[billing] échec Stripe (clé/price invalide ?) — fallback local.', err);
      stripeCustomerId = 'cus_seed_demo';
      stripeSubscriptionId = null;
      status = 'ACTIVE';
    }
  }

  const establishment = await prisma.establishment.upsert({
    where: { id: DEV_ESTABLISHMENT.id },
    create: { id: DEV_ESTABLISHMENT.id, name: DEV_ESTABLISHMENT.name, slug: DEV_ESTABLISHMENT.slug, stripeCustomerId, billingEmail: DEV_ADMIN_EMAIL },
    update: { name: DEV_ESTABLISHMENT.name, slug: DEV_ESTABLISHMENT.slug, billingEmail: DEV_ADMIN_EMAIL },
  });

  await prisma.establishmentMember.upsert({
    where: { establishmentId_userId: { establishmentId: establishment.id, userId: DEV_USER_IDS.admin } },
    create: { establishmentId: establishment.id, userId: DEV_USER_IDS.admin, isBillingContact: true },
    update: { isBillingContact: true },
  });

  await prisma.subscription.upsert({
    where: { establishmentId: establishment.id },
    create: { establishmentId: establishment.id, planTier: 'STARTER', status, stripeSubscriptionId, stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null },
    update: {},
  });

  console.log(`[billing] établissement "${establishment.name}" + abonnement STARTER prêt.`);
}

// ── class ────────────────────────────────────────────────────────────────────

async function seedClass(prisma: PrismaClient) {
  const devClasses = DEV_CLASSES.map((c) => ({
    ...c,
    teacherIds: teacherIdsForClass(c.id),
    studentIds: studentIdsForClass(c.id),
  }));

  for (const course of DEV_COURSES) {
    await prisma.course.upsert({
      where: { id: course.id },
      create: { id: course.id, name: course.name, description: course.description },
      update: { name: course.name, description: course.description },
    });
  }

  for (const spec of devClasses) {
    await prisma.$transaction(async (tx) => {
      await tx.class.upsert({
        where: { id: spec.id },
        create: { id: spec.id, name: spec.name, description: spec.description, establishmentId: DEV_ESTABLISHMENT.id },
        update: { name: spec.name, description: spec.description, establishmentId: DEV_ESTABLISHMENT.id },
      });

      await tx.classTeacher.deleteMany({ where: { classId: spec.id } });
      await tx.classStudent.deleteMany({ where: { classId: spec.id } });

      for (let i = 0; i < spec.teacherIds.length; i++) {
        const teacherId = spec.teacherIds[i]!;
        const courseIds = courseIdsForTeacherInClass(teacherId, spec.id);
        await tx.classTeacher.create({
          data: { classId: spec.id, teacherId, isPrincipal: i === 0, courses: { connect: courseIds.map((id) => ({ id })) } },
        });
      }

      for (const studentId of spec.studentIds) {
        await tx.classStudent.create({ data: { classId: spec.id, studentId } });
      }
    });
  }

  console.log(`[class] ${devClasses.length} classes (profs + élèves inscrits) prêtes.`);
}

// ── grade ────────────────────────────────────────────────────────────────────

const CLASS_CM2A = DEV_CLASSES[0]!.id;
const CLASS_6EME = DEV_CLASSES[1]!.id;
const COURSE_MATHS = DEV_COURSES[0]!.id;
const COURSE_SCIENCES = DEV_COURSES[1]!.id;
const COURSE_FRANCAIS = DEV_COURSES[2]!.id;
const COURSE_HISTOIRE = DEV_COURSES[3]!.id;

const DEV_ASSIGNMENT_IDS = {
  cm2a_maths_ctrl1: 'EEEE0001-EEEE-EEEE-EEEE-000000000001',
  cm2a_maths_ctrl2: 'EEEE0001-EEEE-EEEE-EEEE-000000000002',
  cm2a_francais_dict: 'EEEE0001-EEEE-EEEE-EEEE-000000000003',
  sci6_sciences_tp1: 'EEEE0002-EEEE-EEEE-EEEE-000000000004',
  sci6_histoire_ctrl: 'EEEE0002-EEEE-EEEE-EEEE-000000000005',
  cm2a_maths_draft: 'EEEE0001-EEEE-EEEE-EEEE-000000000006',
} as const;

const devAssignments = [
  { id: DEV_ASSIGNMENT_IDS.cm2a_maths_ctrl1, title: 'Contrôle chapitre 1 — Fractions', classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: DEV_USER_IDS.teacher, assignedAt: new Date('2026-05-15T08:00:00Z'), maxScore: 20, coefficient: 1, status: 'CLOSED' as const },
  { id: DEV_ASSIGNMENT_IDS.cm2a_maths_ctrl2, title: 'Contrôle chapitre 2 — Géométrie', classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: DEV_USER_IDS.teacher, assignedAt: new Date('2026-06-01T08:00:00Z'), maxScore: 20, coefficient: 2, status: 'PUBLISHED' as const },
  { id: DEV_ASSIGNMENT_IDS.cm2a_francais_dict, title: 'Dictée n°3', classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: DEV_USER_IDS.teacher, assignedAt: new Date('2026-06-05T10:00:00Z'), maxScore: 10, coefficient: 1, status: 'PUBLISHED' as const },
  { id: DEV_ASSIGNMENT_IDS.sci6_sciences_tp1, title: 'TP — Observation au microscope', classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: DEV_USER_IDS.teacher, assignedAt: new Date('2026-05-20T14:00:00Z'), maxScore: 20, coefficient: 1, status: 'CLOSED' as const },
  { id: DEV_ASSIGNMENT_IDS.sci6_histoire_ctrl, title: 'Contrôle — Préhistoire', classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: DEV_USER_IDS.teacher, assignedAt: new Date('2026-06-08T09:00:00Z'), maxScore: 20, coefficient: 1, status: 'PUBLISHED' as const },
  { id: DEV_ASSIGNMENT_IDS.cm2a_maths_draft, title: 'Contrôle chapitre 3 — Brouillon', classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: DEV_USER_IDS.teacher, assignedAt: new Date('2026-06-20T08:00:00Z'), maxScore: 20, coefficient: 1, status: 'DRAFT' as const },
];

function gradeStatusForIndex(i: number): 'GRADED' | 'ABSENT' | 'PENDING' {
  if (i % 7 === 0) return 'ABSENT';
  if (i % 5 === 0) return 'PENDING';
  return 'GRADED';
}

function gradeValueForIndex(i: number, maxScore: number): number {
  return Math.min(maxScore, Math.max(0, Number((maxScore * 0.4 + ((i * 3 + 7) % (maxScore * 0.6 + 1))).toFixed(1))));
}

async function seedGrade(prisma: PrismaClient) {
  const devGradeUsers = DEV_STUDENTS.map((s) => ({ id: s.id, name: s.name, email: s.email, classId: s.classId }));

  for (const spec of DEV_CLASSES) {
    await prisma.gradeClass.upsert({
      where: { id: spec.id },
      create: { id: spec.id, name: spec.name, description: spec.description },
      update: { name: spec.name, description: spec.description },
    });
  }

  for (const spec of DEV_SUBJECTS) {
    await prisma.subject.upsert({ where: { id: spec.id }, create: spec, update: { name: spec.name, description: spec.description } });
  }

  for (const spec of DEV_COURSES) {
    await prisma.gradeCourse.upsert({
      where: { id: spec.id },
      create: spec,
      update: { name: spec.name, description: spec.description, subjectId: spec.subjectId },
    });
  }

  for (const spec of DEV_TOPICS) {
    await prisma.topic.upsert({ where: { id: spec.id }, create: spec, update: { name: spec.name, description: spec.description } });
  }

  // Lien Maths ↔ Sciences (cours liés)
  const [mathsCourse, sciencesCourse] = DEV_COURSES;
  if (mathsCourse && sciencesCourse) {
    await prisma.gradeCourse.update({ where: { id: mathsCourse.id }, data: { relatedCourses: { connect: { id: sciencesCourse.id } } } });
  }

  await prisma.gradeUser.deleteMany({ where: { id: DEV_USER_IDS.teacher } });
  for (const spec of devGradeUsers) {
    await prisma.gradeUser.upsert({ where: { id: spec.id }, create: spec, update: { name: spec.name, email: spec.email, classId: spec.classId } });
  }

  await prisma.grade.deleteMany({ where: { assignmentId: { in: Object.values(DEV_ASSIGNMENT_IDS) } } });
  for (const spec of devAssignments) {
    await prisma.assignment.upsert({ where: { id: spec.id }, create: spec, update: { title: spec.title, status: spec.status, assignedAt: spec.assignedAt } });
  }

  const publishedAssignments = devAssignments.filter((a) => a.status !== 'DRAFT');
  let gradeCount = 0;
  for (const assignment of publishedAssignments) {
    const students = devGradeUsers.filter((u) => u.classId === assignment.classId);
    for (let i = 0; i < students.length; i++) {
      const student = students[i]!;
      const gStatus = gradeStatusForIndex(i);
      const value = gStatus === 'GRADED' ? gradeValueForIndex(i, assignment.maxScore) : null;
      await prisma.grade.upsert({
        where: { assignmentId_userId: { assignmentId: assignment.id, userId: student.id } },
        create: { assignmentId: assignment.id, userId: student.id, classId: assignment.classId, courseId: assignment.courseId, status: gStatus, value },
        update: { status: gStatus, value },
      });
      gradeCount++;
    }
  }

  console.log(`[grade] ${DEV_SUBJECTS.length} matières, ${DEV_COURSES.length} cours, ${devAssignments.length} devoirs, ${gradeCount} notes.`);
}

// ── planning ─────────────────────────────────────────────────────────────────

const TEACHER_MAIN = DEV_USER_IDS.teacher;
const TEACHER_MATHS = DEV_TEACHERS[0]!.id;
const TEACHER_SCIENCES = DEV_TEACHERS[1]!.id;
const TEACHER_FRANCAIS = DEV_TEACHERS[2]!.id;
const TEACHER_HISTOIRE = DEV_TEACHERS[3]!.id;

type Slot = { day: number; sh: number; sm: number; eh: number; em: number; classId: string; courseId: string; teacherId: string; room: string };

const WEEKLY_SLOTS: Slot[] = [
  { day: 0, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: TEACHER_MATHS, room: 'A101' },
  { day: 0, sh: 10, sm: 0, eh: 11, em: 30, classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 1, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: TEACHER_MATHS, room: 'A101' },
  { day: 1, sh: 10, sm: 0, eh: 11, em: 0, classId: CLASS_CM2A, courseId: COURSE_HISTOIRE, teacherId: TEACHER_MAIN, room: 'A101' },
  { day: 1, sh: 13, sm: 30, eh: 15, em: 0, classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 2, sh: 8, sm: 0, eh: 10, em: 0, classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 3, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: TEACHER_MATHS, room: 'A101' },
  { day: 3, sh: 10, sm: 0, eh: 11, em: 0, classId: CLASS_CM2A, courseId: COURSE_HISTOIRE, teacherId: TEACHER_MAIN, room: 'A101' },
  { day: 4, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS, teacherId: TEACHER_MATHS, room: 'A101' },
  { day: 4, sh: 10, sm: 0, eh: 11, em: 30, classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 0, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: TEACHER_SCIENCES, room: 'B201' },
  { day: 0, sh: 10, sm: 0, eh: 11, em: 0, classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: TEACHER_HISTOIRE, room: 'B201' },
  { day: 1, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_6EME, courseId: COURSE_MATHS, teacherId: TEACHER_MAIN, room: 'B201' },
  { day: 1, sh: 13, sm: 30, eh: 15, em: 0, classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: TEACHER_SCIENCES, room: 'B201' },
  { day: 2, sh: 8, sm: 0, eh: 10, em: 0, classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: TEACHER_HISTOIRE, room: 'B201' },
  { day: 3, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: TEACHER_SCIENCES, room: 'B201' },
  { day: 3, sh: 10, sm: 0, eh: 11, em: 0, classId: CLASS_6EME, courseId: COURSE_MATHS, teacherId: TEACHER_MAIN, room: 'B201' },
  { day: 4, sh: 8, sm: 0, eh: 9, em: 30, classId: CLASS_6EME, courseId: COURSE_MATHS, teacherId: TEACHER_MAIN, room: 'B201' },
  { day: 4, sh: 10, sm: 0, eh: 11, em: 30, classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: TEACHER_HISTOIRE, room: 'B201' },
];

const SCHOOL_START = new Date('2025-09-01T00:00:00Z');
const SCHOOL_END = new Date('2026-06-30T00:00:00Z');
const VACATIONS: Array<[string, string]> = [
  ['2025-10-18', '2025-11-02'],
  ['2025-12-20', '2026-01-04'],
  ['2026-02-14', '2026-03-01'],
  ['2026-04-11', '2026-04-26'],
];
const BANK_HOLIDAYS = new Set(['2025-11-11', '2026-05-01', '2026-05-08', '2026-05-14', '2026-05-25']);

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSchoolDay(date: Date): boolean {
  const str = toDateStr(date);
  if (BANK_HOLIDAYS.has(str)) return false;
  for (const [from, to] of VACATIONS) {
    if (str >= from && str <= to) return false;
  }
  return true;
}

function buildSessions() {
  const sessions: Array<{ classId: string; courseId: string; teacherId: string; room: string; startAt: Date; endAt: Date; recurrenceRule: string }> = [];
  const cursor = new Date(SCHOOL_START);
  const startDay = cursor.getUTCDay();
  if (startDay !== 1) {
    cursor.setUTCDate(cursor.getUTCDate() + ((8 - startDay) % 7));
  }
  while (cursor <= SCHOOL_END) {
    const weekMonday = new Date(cursor);
    for (const slot of WEEKLY_SLOTS) {
      const sessionDate = new Date(weekMonday);
      sessionDate.setUTCDate(weekMonday.getUTCDate() + slot.day);
      if (sessionDate > SCHOOL_END) continue;
      if (!isSchoolDay(sessionDate)) continue;
      const startAt = new Date(sessionDate);
      startAt.setUTCHours(slot.sh, slot.sm, 0, 0);
      const endAt = new Date(sessionDate);
      endAt.setUTCHours(slot.eh, slot.em, 0, 0);
      sessions.push({ classId: slot.classId, courseId: slot.courseId, teacherId: slot.teacherId, room: slot.room, startAt, endAt, recurrenceRule: 'WEEKLY' });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return sessions;
}

async function seedPlanning(prisma: PrismaClient) {
  await prisma.absenceJustification.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.session.deleteMany();

  const sessionData = buildSessions();
  for (const s of sessionData) {
    await prisma.session.create({ data: s });
  }
  console.log(`[planning] ${sessionData.length} sessions (${WEEKLY_SLOTS.length} créneaux/semaine).`);

  const demoWeekSessions = await prisma.session.findMany({
    where: { startAt: { gte: new Date('2025-10-13T00:00:00Z'), lte: new Date('2025-10-17T23:59:59Z') } },
    orderBy: { startAt: 'asc' },
  });
  const studentsCm2a = DEV_STUDENTS.filter((s) => s.classId === CLASS_CM2A).slice(0, 3);
  const students6eme = DEV_STUDENTS.filter((s) => s.classId === CLASS_6EME).slice(0, 2);
  const cm2aSessions = demoWeekSessions.filter((s) => s.classId === CLASS_CM2A);
  const sixemeSessions = demoWeekSessions.filter((s) => s.classId === CLASS_6EME);

  const absences: Array<{ sessionId: string; userId: string; role: 'STUDENT' | 'TEACHER'; justified: boolean; reason?: string }> = [];
  if (cm2aSessions[0] && studentsCm2a[0]) absences.push({ sessionId: cm2aSessions[0].id, userId: studentsCm2a[0].id, role: 'STUDENT', justified: true, reason: 'Rendez-vous médical' });
  if (cm2aSessions[2] && studentsCm2a[1]) absences.push({ sessionId: cm2aSessions[2].id, userId: studentsCm2a[1].id, role: 'STUDENT', justified: false });
  const mercrediCm2a = cm2aSessions.find((s) => new Date(s.startAt).getUTCDay() === 3);
  if (mercrediCm2a && studentsCm2a[2]) absences.push({ sessionId: mercrediCm2a.id, userId: studentsCm2a[2].id, role: 'STUDENT', justified: true, reason: 'Maladie (certificat fourni)' });
  const mercrediHistoire = sixemeSessions.find((s) => new Date(s.startAt).getUTCDay() === 3 && s.courseId === COURSE_HISTOIRE);
  if (mercrediHistoire) absences.push({ sessionId: mercrediHistoire.id, userId: TEACHER_HISTOIRE, role: 'TEACHER', justified: false });
  const jeudiSciences = sixemeSessions.find((s) => new Date(s.startAt).getUTCDay() === 4 && s.courseId === COURSE_SCIENCES);
  for (const student of students6eme) {
    if (jeudiSciences) absences.push({ sessionId: jeudiSciences.id, userId: student.id, role: 'STUDENT', justified: false });
  }
  for (const absence of absences) {
    await prisma.absence.create({ data: absence });
  }

  const justifWeekSessions = await prisma.session.findMany({
    where: { startAt: { gte: new Date('2025-09-08T00:00:00Z'), lte: new Date('2025-09-12T23:59:59Z') } },
    orderBy: { startAt: 'asc' },
  });
  const justifCm2aSessions = justifWeekSessions.filter((s) => s.classId === CLASS_CM2A);
  const justifSixemeSessions = justifWeekSessions.filter((s) => s.classId === CLASS_6EME);
  const [leaMartin, hugoBernard] = DEV_GENERATED_STUDENTS;
  const emmaDubois = DEV_GENERATED_STUDENTS[2];
  const [eleve6eme1, eleve6eme2] = DEV_STUDENTS.filter((s) => s.classId === CLASS_6EME);

  const fixturesDir = join(__dirname, 'fixtures', 'justifications');
  const storage = new LocalDiskStorageProvider();

  async function attachDocument(justificationId: string, fileName: string, mimeType: string) {
    const buffer = await readFile(join(fixturesDir, fileName));
    const storageKey = await storage.save(buffer, `seed/${justificationId}/${fileName}`);
    await prisma.justificationDocument.create({ data: { justificationId, fileName, mimeType, sizeBytes: buffer.length, storageKey } });
  }

  let justificationCount = 0;
  if (justifCm2aSessions[0] && leaMartin) {
    const absence = await prisma.absence.create({ data: { sessionId: justifCm2aSessions[0].id, userId: leaMartin.id, role: 'STUDENT', justified: true } });
    const justification = await prisma.absenceJustification.create({
      data: { studentId: leaMartin.id, status: 'APPROVED', reason: 'Rendez-vous médical', reviewerId: TEACHER_MAIN, reviewedAt: new Date(), absences: { create: [{ absenceId: absence.id }] } },
    });
    await attachDocument(justification.id, 'certificat-medical.pdf', 'application/pdf');
    justificationCount++;
  }
  if (justifCm2aSessions[1] && hugoBernard) {
    const absence = await prisma.absence.create({ data: { sessionId: justifCm2aSessions[1].id, userId: hugoBernard.id, role: 'STUDENT', justified: false } });
    const justification = await prisma.absenceJustification.create({
      data: { studentId: hugoBernard.id, status: 'PENDING', reason: 'Convocation administrative', absences: { create: [{ absenceId: absence.id }] } },
    });
    await attachDocument(justification.id, 'convocation.pdf', 'application/pdf');
    justificationCount++;
  }
  if (justifSixemeSessions[0] && eleve6eme1) {
    const absence = await prisma.absence.create({ data: { sessionId: justifSixemeSessions[0].id, userId: eleve6eme1.id, role: 'STUDENT', justified: false } });
    const justification = await prisma.absenceJustification.create({
      data: { studentId: eleve6eme1.id, status: 'REJECTED', reason: 'Oubli de venir en cours', reviewerId: TEACHER_SCIENCES, reviewComment: 'Motif non recevable — merci de fournir un justificatif officiel.', reviewedAt: new Date(), absences: { create: [{ absenceId: absence.id }] } },
    });
    await attachDocument(justification.id, 'photo-justificatif.png', 'image/png');
    justificationCount++;
  }
  if (justifSixemeSessions[1] && eleve6eme2) {
    await prisma.absence.create({ data: { sessionId: justifSixemeSessions[1].id, userId: eleve6eme2.id, role: 'STUDENT', justified: false } });
  }
  if (justifCm2aSessions[2] && emmaDubois) {
    await prisma.absence.create({ data: { sessionId: justifCm2aSessions[2].id, userId: emmaDubois.id, role: 'STUDENT', justified: true, reason: 'Justifiée manuellement par le professeur (sans document)' } });
  }

  console.log(`[planning] ${absences.length} absences + ${justificationCount} justifications de démonstration.`);
}

// ── message ──────────────────────────────────────────────────────────────────

async function seedMessage(prisma: PrismaClient) {
  const TEACHER_ID = DEV_USER_IDS.teacher;
  const STUDENT_ID = DEV_USER_IDS.student;
  const CONV_ID = 'seed-conv-1';

  await prisma.conversation.upsert({ where: { id: CONV_ID }, update: {}, create: { id: CONV_ID, name: 'Conversation test' } });
  await prisma.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: CONV_ID, userId: TEACHER_ID } }, update: {}, create: { conversationId: CONV_ID, userId: TEACHER_ID } });
  await prisma.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: CONV_ID, userId: STUDENT_ID } }, update: {}, create: { conversationId: CONV_ID, userId: STUDENT_ID } });

  await prisma.message.upsert({ where: { id: 'seed-msg-1' }, update: {}, create: { id: 'seed-msg-1', conversationId: CONV_ID, senderId: TEACHER_ID, content: 'Bonjour, avez-vous des questions ?' } });
  await prisma.message.upsert({ where: { id: 'seed-msg-2' }, update: {}, create: { id: 'seed-msg-2', conversationId: CONV_ID, senderId: STUDENT_ID, content: 'Oui, sur le devoir de la semaine.' } });
  await prisma.message.upsert({ where: { id: 'seed-msg-3' }, update: {}, create: { id: 'seed-msg-3', conversationId: CONV_ID, senderId: TEACHER_ID, content: 'Je vous écoute, posez votre question.' } });

  await prisma.messageRead.upsert({ where: { messageId_userId: { messageId: 'seed-msg-1', userId: STUDENT_ID } }, update: {}, create: { messageId: 'seed-msg-1', userId: STUDENT_ID } });
  await prisma.messageRead.upsert({ where: { messageId_userId: { messageId: 'seed-msg-2', userId: TEACHER_ID } }, update: {}, create: { messageId: 'seed-msg-2', userId: TEACHER_ID } });

  console.log('[message] conversation de démonstration (3 messages, 1 non lu côté élève) prête.');
}

// ── parent ───────────────────────────────────────────────────────────────────

async function seedParent(prisma: PrismaClient) {
  await prisma.parentStudent.deleteMany();
  let linkCount = 0;
  for (const parent of DEV_PARENTS) {
    for (const child of parent.children) {
      await prisma.parentStudent.create({ data: { parentId: parent.id, studentId: child.studentId, isPrimary: child.isPrimary } });
      linkCount++;
    }
  }
  console.log(`[parent] ${linkCount} liens parent ↔ enfant prêts.`);
}

// ── orchestration ─────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Seed backend (monolithe modulaire) — base unique multi-schema');
    await seedAuth(prisma);
    await seedBilling(prisma);
    await seedClass(prisma);
    await seedGrade(prisma);
    await seedPlanning(prisma);
    await seedMessage(prisma);
    await seedParent(prisma);

    console.log('\n✓ Seed complet. Comptes de login :');
    console.log('  dev.admin@skolr.local      / dev-admin-123     (ADMIN)');
    console.log('  dev.user@skolr.local       / dev-user-123      (USER)');
    console.log('  dev.teacher@skolr.local    / dev-teacher-123   (TEACHER)');
    console.log('  dev.student@skolr.local    / dev-student-123   (USER/élève)');
    console.log('  platform.admin@skolr.local / dev-platform-123  (PLATFORM_ADMIN)');
    console.log('\nLogin : POST http://localhost:3001/auth/login  { "email": "...", "password": "..." }');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
