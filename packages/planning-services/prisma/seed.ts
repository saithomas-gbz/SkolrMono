import 'dotenv/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { LocalDiskStorageProvider } from '../src/lib/storage/localDiskStorageProvider';
import {
  DEV_CLASSES,
  DEV_COURSES,
  DEV_TEACHERS,
  DEV_STUDENTS,
  DEV_GENERATED_STUDENTS,
  DEV_USER_IDS,
} from '../../../scripts/seed/dev-users';

// ─── IDs stables ────────────────────────────────────────────────────────────

const CLASS_CM2A = DEV_CLASSES[0]!.id;       // CM2-A
const CLASS_6EME = DEV_CLASSES[1]!.id;       // 6ème Sciences

const COURSE_MATHS    = DEV_COURSES[0]!.id;  // Mathématiques
const COURSE_SCIENCES = DEV_COURSES[1]!.id;  // Sciences
const COURSE_FRANCAIS = DEV_COURSES[2]!.id;  // Français
const COURSE_HISTOIRE = DEV_COURSES[3]!.id;  // Histoire-Géo

const TEACHER_MAIN    = DEV_USER_IDS.teacher;              // dev.teacher
const TEACHER_MATHS   = DEV_TEACHERS[0]!.id;              // prof.maths   → CM2-A
const TEACHER_SCIENCES= DEV_TEACHERS[1]!.id;              // prof.sciences → 6ème
const TEACHER_FRANCAIS= DEV_TEACHERS[2]!.id;              // prof.francais → CM2-A
const TEACHER_HISTOIRE= DEV_TEACHERS[3]!.id;              // prof.histoire → 6ème

// ─── Emploi du temps hebdomadaire ────────────────────────────────────────────

type Slot = {
  day: number;   // 0=lun … 4=ven
  sh: number; sm: number; // heure début
  eh: number; em: number; // heure fin
  classId: string;
  courseId: string;
  teacherId: string;
  room: string;
};

const WEEKLY_SLOTS: Slot[] = [
  // ── CM2-A ─────────────────────────────────────────────────────────────────
  { day: 0, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS,    teacherId: TEACHER_MATHS,    room: 'A101' },
  { day: 0, sh: 10, sm: 0,  eh: 11, em: 30, classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 1, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS,    teacherId: TEACHER_MATHS,    room: 'A101' },
  { day: 1, sh: 10, sm: 0,  eh: 11, em: 0,  classId: CLASS_CM2A, courseId: COURSE_HISTOIRE, teacherId: TEACHER_MAIN,     room: 'A101' },
  { day: 1, sh: 13, sm: 30, eh: 15, em: 0,  classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 2, sh: 8,  sm: 0,  eh: 10, em: 0,  classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },
  { day: 3, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS,    teacherId: TEACHER_MATHS,    room: 'A101' },
  { day: 3, sh: 10, sm: 0,  eh: 11, em: 0,  classId: CLASS_CM2A, courseId: COURSE_HISTOIRE, teacherId: TEACHER_MAIN,     room: 'A101' },
  { day: 4, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_CM2A, courseId: COURSE_MATHS,    teacherId: TEACHER_MATHS,    room: 'A101' },
  { day: 4, sh: 10, sm: 0,  eh: 11, em: 30, classId: CLASS_CM2A, courseId: COURSE_FRANCAIS, teacherId: TEACHER_FRANCAIS, room: 'A101' },

  // ── 6ème Sciences ─────────────────────────────────────────────────────────
  { day: 0, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: TEACHER_SCIENCES, room: 'B201' },
  { day: 0, sh: 10, sm: 0,  eh: 11, em: 0,  classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: TEACHER_HISTOIRE, room: 'B201' },
  { day: 1, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_6EME, courseId: COURSE_MATHS,    teacherId: TEACHER_MAIN,     room: 'B201' },
  { day: 1, sh: 13, sm: 30, eh: 15, em: 0,  classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: TEACHER_SCIENCES, room: 'B201' },
  { day: 2, sh: 8,  sm: 0,  eh: 10, em: 0,  classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: TEACHER_HISTOIRE, room: 'B201' },
  { day: 3, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_6EME, courseId: COURSE_SCIENCES, teacherId: TEACHER_SCIENCES, room: 'B201' },
  { day: 3, sh: 10, sm: 0,  eh: 11, em: 0,  classId: CLASS_6EME, courseId: COURSE_MATHS,    teacherId: TEACHER_MAIN,     room: 'B201' },
  { day: 4, sh: 8,  sm: 0,  eh: 9,  em: 30, classId: CLASS_6EME, courseId: COURSE_MATHS,    teacherId: TEACHER_MAIN,     room: 'B201' },
  { day: 4, sh: 10, sm: 0,  eh: 11, em: 30, classId: CLASS_6EME, courseId: COURSE_HISTOIRE, teacherId: TEACHER_HISTOIRE, room: 'B201' },
];

// ─── Calendrier scolaire 2025-2026 ───────────────────────────────────────────

const SCHOOL_START = new Date('2025-09-01T00:00:00Z');
const SCHOOL_END   = new Date('2026-06-30T00:00:00Z');

// Vacances (dates incluses)
const VACATIONS: Array<[string, string]> = [
  ['2025-10-18', '2025-11-02'], // Toussaint
  ['2025-12-20', '2026-01-04'], // Noël
  ['2026-02-14', '2026-03-01'], // Hiver
  ['2026-04-11', '2026-04-26'], // Printemps
];

// Jours fériés isolés
const BANK_HOLIDAYS = new Set([
  '2025-11-11', // Armistice
  '2026-05-01', // Fête du Travail
  '2026-05-08', // Victoire 1945
  '2026-05-14', // Ascension (Pâques 2026 = 5 avril → +39j)
  '2026-05-25', // Lundi de Pentecôte (Pâques +50j)
]);

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
  const sessions: Array<{
    classId: string; courseId: string; teacherId: string;
    room: string; startAt: Date; endAt: Date; recurrenceRule: string;
  }> = [];

  // Itérer semaine par semaine depuis le lundi de la première semaine scolaire
  const cursor = new Date(SCHOOL_START);
  // Avancer au lundi si SCHOOL_START n'est pas un lundi (ici c'est le cas mais au cas où)
  const startDay = cursor.getUTCDay(); // 0=dim
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

      sessions.push({
        classId: slot.classId,
        courseId: slot.courseId,
        teacherId: slot.teacherId,
        room: slot.room,
        startAt,
        endAt,
        recurrenceRule: 'WEEKLY',
      });
    }

    // Semaine suivante
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return sessions;
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // Nettoyage complet (dev seed idempotent)
    await prisma.absenceJustification.deleteMany(); // cascade → documents + liens
    await prisma.absence.deleteMany();
    await prisma.session.deleteMany();

    const sessionData = buildSessions();

    // Insérer par batch de 100
    const batchSize = 100;
    const createdIds: string[] = [];
    for (let i = 0; i < sessionData.length; i += batchSize) {
      const batch = sessionData.slice(i, i + batchSize);
      for (const s of batch) {
        const created = await prisma.session.create({ data: s });
        createdIds.push(created.id);
      }
    }

    console.log(`  • ${createdIds.length} sessions créées (${WEEKLY_SLOTS.length} créneaux/semaine)`);

    // ── Absences de démonstration ──────────────────────────────────────────
    // On cible les sessions de la semaine du 13 octobre 2025 (avant les vacances Toussaint)

    const demoWeekSessions = await prisma.session.findMany({
      where: {
        startAt: {
          gte: new Date('2025-10-13T00:00:00Z'),
          lte: new Date('2025-10-17T23:59:59Z'),
        },
      },
      orderBy: { startAt: 'asc' },
    });

    // Quelques élèves de CM2-A
    const studentsCm2a = DEV_STUDENTS.filter((s) => s.classId === CLASS_CM2A).slice(0, 3);
    // Quelques élèves de 6ème
    const students6eme = DEV_STUDENTS.filter((s) => s.classId === CLASS_6EME).slice(0, 2);

    const cm2aSessions = demoWeekSessions.filter((s) => s.classId === CLASS_CM2A);
    const sixemeSessions = demoWeekSessions.filter((s) => s.classId === CLASS_6EME);

    const absences: Array<{
      sessionId: string; userId: string;
      role: 'STUDENT' | 'TEACHER';
      justified: boolean; reason?: string;
    }> = [];

    // Léa Martin absente lundi matin (Maths CM2-A) — justifiée
    if (cm2aSessions[0] && studentsCm2a[0]) {
      absences.push({
        sessionId: cm2aSessions[0].id,
        userId: studentsCm2a[0].id,
        role: 'STUDENT',
        justified: true,
        reason: 'Rendez-vous médical',
      });
    }

    // Hugo Bernard absent mardi (Histoire CM2-A) — non justifiée
    if (cm2aSessions[2] && studentsCm2a[1]) {
      absences.push({
        sessionId: cm2aSessions[2].id,
        userId: studentsCm2a[1].id,
        role: 'STUDENT',
        justified: false,
      });
    }

    // Emma Dubois absente mercredi (Français CM2-A) — justifiée
    const mercrediCm2a = cm2aSessions.find(
      (s) => new Date(s.startAt).getUTCDay() === 3,
    );
    if (mercrediCm2a && studentsCm2a[2]) {
      absences.push({
        sessionId: mercrediCm2a.id,
        userId: studentsCm2a[2].id,
        role: 'STUDENT',
        justified: true,
        reason: 'Maladie (certificat fourni)',
      });
    }

    // prof.histoire absent mercredi 6ème — non justifiée
    const mercrediHistoire = sixemeSessions.find(
      (s) => new Date(s.startAt).getUTCDay() === 3 && s.courseId === COURSE_HISTOIRE,
    );
    if (mercrediHistoire) {
      absences.push({
        sessionId: mercrediHistoire.id,
        userId: TEACHER_HISTOIRE,
        role: 'TEACHER',
        justified: false,
      });
    }

    // Deux élèves 6ème absents jeudi (Sciences)
    const jeudiSciences = sixemeSessions.find(
      (s) => new Date(s.startAt).getUTCDay() === 4 && s.courseId === COURSE_SCIENCES,
    );
    for (const student of students6eme) {
      if (jeudiSciences) {
        absences.push({
          sessionId: jeudiSciences.id,
          userId: student.id,
          role: 'STUDENT',
          justified: false,
        });
      }
    }

    for (const absence of absences) {
      await prisma.absence.create({ data: absence });
    }

    console.log(`  • ${absences.length} absences de démonstration (semaine du 13 oct. 2025)`);

    // ── Justifications d'absence de démonstration (issue #80) ───────────────
    // Semaine du 8 sept. 2025 (distincte de la semaine du 13 oct. ci-dessus,
    // pour ne jamais entrer en collision avec les absences déjà créées).

    const justifWeekSessions = await prisma.session.findMany({
      where: {
        startAt: {
          gte: new Date('2025-09-08T00:00:00Z'),
          lte: new Date('2025-09-12T23:59:59Z'),
        },
      },
      orderBy: { startAt: 'asc' },
    });
    const justifCm2aSessions = justifWeekSessions.filter((s) => s.classId === CLASS_CM2A);
    const justifSixemeSessions = justifWeekSessions.filter((s) => s.classId === CLASS_6EME);

    const [leaMartin, hugoBernard, emmaDubois] = DEV_GENERATED_STUDENTS;
    const [eleve6eme1, eleve6eme2] = DEV_STUDENTS.filter((s) => s.classId === CLASS_6EME);

    const fixturesDir = join(__dirname, 'fixtures', 'justifications');
    const storage = new LocalDiskStorageProvider();

    async function attachDocument(justificationId: string, fileName: string, mimeType: string) {
      const buffer = await readFile(join(fixturesDir, fileName));
      const storageKey = await storage.save(buffer, `seed/${justificationId}/${fileName}`);
      await prisma.justificationDocument.create({
        data: { justificationId, fileName, mimeType, sizeBytes: buffer.length, storageKey },
      });
    }

    let justificationCount = 0;

    // Scénario 1 — Léa Martin : demande approuvée avec un certificat médical
    if (justifCm2aSessions[0] && leaMartin) {
      const absence = await prisma.absence.create({
        data: { sessionId: justifCm2aSessions[0].id, userId: leaMartin.id, role: 'STUDENT', justified: true },
      });
      const justification = await prisma.absenceJustification.create({
        data: {
          studentId: leaMartin.id,
          status: 'APPROVED',
          reason: 'Rendez-vous médical',
          reviewerId: TEACHER_MAIN,
          reviewedAt: new Date(),
          absences: { create: [{ absenceId: absence.id }] },
        },
      });
      await attachDocument(justification.id, 'certificat-medical.pdf', 'application/pdf');
      justificationCount++;
    }

    // Scénario 2 — Hugo Bernard : demande en attente avec une convocation
    if (justifCm2aSessions[1] && hugoBernard) {
      const absence = await prisma.absence.create({
        data: { sessionId: justifCm2aSessions[1].id, userId: hugoBernard.id, role: 'STUDENT', justified: false },
      });
      const justification = await prisma.absenceJustification.create({
        data: {
          studentId: hugoBernard.id,
          status: 'PENDING',
          reason: 'Convocation administrative',
          absences: { create: [{ absenceId: absence.id }] },
        },
      });
      await attachDocument(justification.id, 'convocation.pdf', 'application/pdf');
      justificationCount++;
    }

    // Scénario 3 — Élève 6ème #1 : demande refusée avec commentaire
    if (justifSixemeSessions[0] && eleve6eme1) {
      const absence = await prisma.absence.create({
        data: { sessionId: justifSixemeSessions[0].id, userId: eleve6eme1.id, role: 'STUDENT', justified: false },
      });
      const justification = await prisma.absenceJustification.create({
        data: {
          studentId: eleve6eme1.id,
          status: 'REJECTED',
          reason: 'Oubli de venir en cours',
          reviewerId: TEACHER_SCIENCES,
          reviewComment: "Motif non recevable — merci de fournir un justificatif officiel.",
          reviewedAt: new Date(),
          absences: { create: [{ absenceId: absence.id }] },
        },
      });
      await attachDocument(justification.id, 'photo-justificatif.png', 'image/png');
      justificationCount++;
    }

    // Scénario 4 — Élève 6ème #2 : absence sans aucune demande (reste non justifiée)
    if (justifSixemeSessions[1] && eleve6eme2) {
      await prisma.absence.create({
        data: { sessionId: justifSixemeSessions[1].id, userId: eleve6eme2.id, role: 'STUDENT', justified: false },
      });
    }

    // Scénario 5 — Emma Dubois : justification manuelle legacy (sans demande ni document)
    if (justifCm2aSessions[2] && emmaDubois) {
      await prisma.absence.create({
        data: {
          sessionId: justifCm2aSessions[2].id,
          userId: emmaDubois.id,
          role: 'STUDENT',
          justified: true,
          reason: 'Justifiée manuellement par le professeur (sans document)',
        },
      });
    }

    console.log(`  • ${justificationCount} demandes de justification de démonstration (semaine du 8 sept. 2025)`);
    console.log('\nSeed planning-services: emploi du temps 2025-2026 prêt.');
    console.log('  GET http://localhost:3008/sessions?from=2025-10-13T00:00:00Z&to=2025-10-17T23:59:59Z');
    console.log('  GET http://localhost:3008/absences');
    console.log('  GET http://localhost:3008/absence-justifications');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
