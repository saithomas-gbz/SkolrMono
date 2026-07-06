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

mock.module('../lib/classServiceClient', () => ({
  getClassIdsForTeacher: mock(() => Promise.resolve<string[]>([])),
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
