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

mock.module('../lib/parentServiceClient', () => ({
  getChildIds: mock(() => Promise.resolve<string[]>([])),
}));

const { getSessions } = await import('../controllers/sessionController');
const db = (await import('../../../shared/db')).default as unknown as {
  session: { findMany: ReturnType<typeof mock> };
};
const { getClassIdsForStudent, getClassIdsForTeacher } = (await import(
  '../lib/classServiceClient'
)) as unknown as {
  getClassIdsForStudent: ReturnType<typeof mock>;
  getClassIdsForTeacher: ReturnType<typeof mock>;
};
const { getChildIds } = (await import('../lib/parentServiceClient')) as unknown as {
  getChildIds: ReturnType<typeof mock>;
};

type PlanningUser = { userId: string; email: string; role: string };

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

type GetSessionsRequest = Parameters<typeof getSessions>[0];

function buildReq(
  query: Record<string, unknown>,
  planningUser?: PlanningUser,
): GetSessionsRequest {
  return { query, planningUser } as unknown as GetSessionsRequest;
}

const admin: PlanningUser = { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN' };

beforeEach(() => {
  db.session.findMany.mockReset();
  db.session.findMany.mockResolvedValue([]);
  getClassIdsForStudent.mockReset();
  getClassIdsForStudent.mockResolvedValue([]);
  getClassIdsForTeacher.mockReset();
  getClassIdsForTeacher.mockResolvedValue([]);
  getChildIds.mockReset();
  getChildIds.mockResolvedValue([]);
});

describe('getSessions — admin (pass-through)', () => {
  it('filtre par classId seul', async () => {
    const reply = buildReply();

    await getSessions(buildReq({ classId: 'class-1' }, admin), reply);

    expect(getClassIdsForStudent).not.toHaveBeenCalled();
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { equals: 'class-1' } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('filtre par studentId seul en résolvant ses classes', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-1', 'class-2']);
    const reply = buildReply();

    await getSessions(buildReq({ studentId: 'student-1' }, admin), reply);

    expect(getClassIdsForStudent).toHaveBeenCalledWith('student-1');
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['class-1', 'class-2'] } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('filtre par teacherId seul', async () => {
    const reply = buildReply();

    await getSessions(buildReq({ teacherId: 'teacher-9' }, admin), reply);

    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { teacherId: 'teacher-9' },
      orderBy: { startAt: 'asc' },
    });
  });

  it('combine classId + studentId cohérents (équivaut à classId)', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-1', 'class-2']);
    const reply = buildReply();

    await getSessions(buildReq({ classId: 'class-1', studentId: 'student-1' }, admin), reply);

    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { equals: 'class-1' } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('renvoie une liste vide si le studentId demandé n\'est pas dans la classe', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-2']);
    const reply = buildReply();

    await getSessions(buildReq({ classId: 'class-1', studentId: 'student-1' }, admin), reply);

    expect(db.session.findMany).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith([]);
  });
});

describe('getSessions — élève (USER)', () => {
  it('restreint aux classes de l\'élève et ignore un teacherId demandé', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-1', 'class-2']);
    const reply = buildReply();
    const student: PlanningUser = { userId: 'student-1', email: 's@skolr.local', role: 'USER' };

    await getSessions(buildReq({ teacherId: 'teacher-9' }, student), reply);

    expect(getClassIdsForStudent).toHaveBeenCalledWith('student-1');
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['class-1', 'class-2'] } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('renvoie [] si l\'élève demande une classe qui n\'est pas la sienne', async () => {
    getClassIdsForStudent.mockResolvedValue(['class-2']);
    const reply = buildReply();
    const student: PlanningUser = { userId: 'student-1', email: 's@skolr.local', role: 'USER' };

    await getSessions(buildReq({ classId: 'class-1' }, student), reply);

    expect(db.session.findMany).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith([]);
  });
});

describe('getSessions — parent (PARENT)', () => {
  it('restreint aux classes des enfants', async () => {
    getChildIds.mockResolvedValue(['child-1', 'child-2']);
    getClassIdsForStudent.mockImplementation((id: string) =>
      Promise.resolve(id === 'child-1' ? ['class-1'] : ['class-2']),
    );
    const reply = buildReply();
    const parent: PlanningUser = { userId: 'parent-1', email: 'p@skolr.local', role: 'PARENT' };

    await getSessions(buildReq({}, parent), reply);

    expect(getChildIds).toHaveBeenCalledWith('parent-1');
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['class-1', 'class-2'] } },
      orderBy: { startAt: 'asc' },
    });
  });
});

describe('getSessions — enseignant (TEACHER/STAFF)', () => {
  it('vue « Mes matières » par défaut : uniquement ses séances', async () => {
    const reply = buildReply();
    const teacher: PlanningUser = { userId: 'teacher-1', email: 't@skolr.local', role: 'TEACHER' };

    await getSessions(buildReq({}, teacher), reply);

    expect(getClassIdsForTeacher).not.toHaveBeenCalled();
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { teacherId: 'teacher-1' },
      orderBy: { startAt: 'asc' },
    });
  });

  it('ignore un teacherId arbitraire en vue « Mes matières »', async () => {
    const reply = buildReply();
    const teacher: PlanningUser = { userId: 'teacher-1', email: 't@skolr.local', role: 'STAFF' };

    await getSessions(buildReq({ teacherId: 'teacher-9' }, teacher), reply);

    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { teacherId: 'teacher-1' },
      orderBy: { startAt: 'asc' },
    });
  });

  it('scope=class sur une classe enseignée : toutes les séances de la classe', async () => {
    getClassIdsForTeacher.mockResolvedValue(['class-1', 'class-2']);
    const reply = buildReply();
    const teacher: PlanningUser = { userId: 'teacher-1', email: 't@skolr.local', role: 'TEACHER' };

    await getSessions(buildReq({ scope: 'class', classId: 'class-1' }, teacher), reply);

    expect(getClassIdsForTeacher).toHaveBeenCalledWith('teacher-1');
    expect(db.session.findMany).toHaveBeenCalledWith({
      where: { classId: { equals: 'class-1' } },
      orderBy: { startAt: 'asc' },
    });
  });

  it('scope=class sur une classe non enseignée : 403', async () => {
    getClassIdsForTeacher.mockResolvedValue(['class-2']);
    const reply = buildReply();
    const teacher: PlanningUser = { userId: 'teacher-1', email: 't@skolr.local', role: 'TEACHER' };

    await getSessions(buildReq({ scope: 'class', classId: 'class-1' }, teacher), reply);

    expect(db.session.findMany).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});
