import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    session: { findMany: mock() },
  },
}));

mock.module('../lib/classServiceClient', () => ({
  getClassIdsForTeacher: mock(() => Promise.resolve<string[]>([])),
  getClassIdsForStudent: mock(() => Promise.resolve<string[]>([])),
}));

const { getSessions } = await import('../controllers/sessionController');
const db = (await import('../../../shared/db')).default as unknown as {
  session: { findMany: ReturnType<typeof mock> };
};
const { getClassIdsForStudent } = (await import('../lib/classServiceClient')) as unknown as {
  getClassIdsForStudent: ReturnType<typeof mock>;
};

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

type GetSessionsRequest = Parameters<typeof getSessions>[0];

beforeEach(() => {
  db.session.findMany.mockReset();
  db.session.findMany.mockResolvedValue([]);
  getClassIdsForStudent.mockReset();
  getClassIdsForStudent.mockResolvedValue([]);
});

describe('getSessions', () => {
  it('filtre par classId seul (comportement inchangé)', async () => {
    const req = { query: { classId: 'class-1' } } as unknown as GetSessionsRequest;
    const reply = buildReply();

    await getSessions(req, reply);

    expect(getClassIdsForStudent).not.toHaveBeenCalled();
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { equals: 'class-1' } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('filtre par studentId seul en résolvant ses classes via class-service', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-1', 'class-2']);
    const req = { query: { studentId: 'student-1' } } as unknown as GetSessionsRequest;
    const reply = buildReply();

    await getSessions(req, reply);

    expect(getClassIdsForStudent).toHaveBeenCalledWith('student-1');
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['class-1', 'class-2'] } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('combine classId + studentId cohérents (équivaut à classId)', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-1', 'class-2']);
    const req = {
      query: { classId: 'class-1', studentId: 'student-1' },
    } as unknown as GetSessionsRequest;
    const reply = buildReply();

    await getSessions(req, reply);

    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { equals: 'class-1' } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('renvoie une liste vide sans interroger les sessions si l\'élève n\'est pas dans la classe', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-2']);
    const req = {
      query: { classId: 'class-1', studentId: 'student-1' },
    } as unknown as GetSessionsRequest;
    const reply = buildReply();

    await getSessions(req, reply);

    expect(db.session.findMany).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith([]);
  });
});
