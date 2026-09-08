import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    absence: { findMany: mock() },
  },
}));

mock.module('../../../shared/events', () => ({
  publish: mock(() => Promise.resolve()),
}));

// Superset des exports de classServiceClient : bun applique mock.module globalement,
// et sessionController importe aussi getClassIdsForStudent — le mock doit tout fournir.
mock.module('../lib/classServiceClient', () => ({
  getClassIdsForTeacher: mock(() => Promise.resolve<string[]>([])),
  getClassIdsForStudent: mock(() => Promise.resolve<string[]>([])),
}));

mock.module('../lib/parentServiceClient', () => ({
  getChildIds: mock(() => Promise.resolve<string[]>([])),
}));

const { getAbsences } = await import('../controllers/absenceController');
const db = (await import('../../../shared/db')).default as unknown as {
  absence: { findMany: ReturnType<typeof mock> };
};
const { getClassIdsForTeacher } = (await import('../lib/classServiceClient')) as unknown as {
  getClassIdsForTeacher: ReturnType<typeof mock>;
};

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

type GetAbsencesRequest = Parameters<typeof getAbsences>[0];

beforeEach(() => {
  db.absence.findMany.mockReset();
  db.absence.findMany.mockResolvedValue([]);
  getClassIdsForTeacher.mockReset();
  getClassIdsForTeacher.mockResolvedValue([]);
});

describe('getAbsences', () => {
  it('un eleve peut lire les absences des enseignants', async () => {
    // Une absence d'enseignant est une information d'organisation : toute la
    // classe doit savoir qu'un cours n'aura pas lieu. Sans cette exception, le
    // cloisonnement de #80 renvoyait une liste vide et le creneau s'affichait
    // comme assure dans l'emploi du temps des eleves.
    const req = {
      query: { role: 'TEACHER' },
      planningUser: { userId: 'eleve-1', role: 'USER' },
    } as unknown as GetAbsencesRequest;
    const reply = buildReply();

    await getAbsences(req, reply);

    expect(db.absence.findMany).toHaveBeenCalledWith({
      where: { role: 'TEACHER' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('un eleve reste cloisonne sur les absences d eleves', async () => {
    // L'ouverture ci-dessus ne doit valoir que pour `role=TEACHER` : sans ce
    // filtre, un eleve lirait les absences de ses camarades.
    const req = {
      query: { role: 'STUDENT', userId: 'camarade-2' },
      planningUser: { userId: 'eleve-1', role: 'USER' },
    } as unknown as GetAbsencesRequest;
    const reply = buildReply();

    await getAbsences(req, reply);

    expect(db.absence.findMany).toHaveBeenCalledWith({
      where: { userId: 'eleve-1', role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('un eleve sans filtre de role ne voit que les siennes', async () => {
    const req = {
      query: {},
      planningUser: { userId: 'eleve-1', role: 'USER' },
    } as unknown as GetAbsencesRequest;
    const reply = buildReply();

    await getAbsences(req, reply);

    expect(db.absence.findMany).toHaveBeenCalledWith({
      where: { userId: 'eleve-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filtre par justified seul (comportement inchangé)', async () => {
    const req = { query: { justified: false } } as unknown as GetAbsencesRequest;
    const reply = buildReply();

    await getAbsences(req, reply);

    expect(getClassIdsForTeacher).not.toHaveBeenCalled();
    expect(db.absence.findMany).toHaveBeenCalledWith({
      where: { justified: false },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('résout les classes du prof via teacherId et filtre les absences par session.classId', async () => {
    getClassIdsForTeacher.mockResolvedValue(['class-1', 'class-2']);
    const req = {
      query: { teacherId: 'teacher-1', role: 'STUDENT', justified: false },
    } as unknown as GetAbsencesRequest;
    const reply = buildReply();

    await getAbsences(req, reply);

    expect(getClassIdsForTeacher).toHaveBeenCalledWith('teacher-1');
    expect(db.absence.findMany).toHaveBeenCalledWith({
      where: {
        role: 'STUDENT',
        justified: false,
        session: { classId: { in: ['class-1', 'class-2'] } },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('un élève ne voit que ses propres absences même avec un teacherId fourni', async () => {
    getClassIdsForTeacher.mockResolvedValue(['class-1']);
    const req = {
      query: { teacherId: 'teacher-1' },
      planningUser: { userId: 'student-1', email: '', role: 'USER' },
    } as unknown as GetAbsencesRequest;
    const reply = buildReply();

    await getAbsences(req, reply);

    expect(db.absence.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'student-1',
        session: { classId: { in: ['class-1'] } },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
