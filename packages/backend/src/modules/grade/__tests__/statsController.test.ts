import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

// Bypasse le cache TTL pour des tests déterministes (pas d'état partagé entre cas).
mock.module('../lib/ttlCache', () => ({
  getOrCompute: (_key: string, _ttlMs: number, compute: () => unknown) => compute(),
}));

mock.module('../db', () => ({
  default: {
    grade: { findMany: mock(), count: mock() },
    user: { findUnique: mock(), findMany: mock() },
    assignment: { findUnique: mock() },
  },
}));

mock.module('../lib/classServiceClient', () => ({
  getClassIdsForTeacher: mock(() => Promise.resolve<string[]>([])),
  teacherTeachesCourse: mock(() => Promise.resolve(true)),
}));

const statsController = (await import('../controllers/statsController')).default;
const db = (await import('../db')).default as unknown as {
  grade: { findMany: ReturnType<typeof mock>; count: ReturnType<typeof mock> };
  user: { findUnique: ReturnType<typeof mock>; findMany: ReturnType<typeof mock> };
  assignment: { findUnique: ReturnType<typeof mock> };
};
const { getClassIdsForTeacher, teacherTeachesCourse } = (await import('../lib/classServiceClient')) as unknown as {
  getClassIdsForTeacher: ReturnType<typeof mock>;
  teacherTeachesCourse: ReturnType<typeof mock>;
};

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

type GetClassStatsRequest = Parameters<typeof statsController.getClassStats>[0];
type GetUserStatsRequest = Parameters<typeof statsController.getUserStats>[0];
type GetAssignmentStatsRequest = Parameters<typeof statsController.getAssignmentStats>[0];

function gradeFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grade-1',
    userId: 'user-1',
    classId: 'class-1',
    courseId: 'course-1',
    status: 'GRADED',
    value: 15,
    assignment: { assignedAt: new Date('2026-06-01T00:00:00Z'), coefficient: 1 },
    course: { name: 'Mathématiques', subject: { name: 'Sciences' } },
    ...overrides,
  };
}

function assignmentFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assignment-1',
    classId: 'class-1',
    courseId: 'course-1',
    ...overrides,
  };
}

beforeEach(() => {
  db.grade.findMany.mockReset();
  db.grade.count.mockReset();
  db.user.findUnique.mockReset();
  db.user.findMany.mockReset();
  db.assignment.findUnique.mockReset();
  db.assignment.findUnique.mockResolvedValue(assignmentFixture());
  getClassIdsForTeacher.mockReset();
  getClassIdsForTeacher.mockResolvedValue([]);
  teacherTeachesCourse.mockReset();
  teacherTeachesCourse.mockResolvedValue(true);
});

describe('getClassStats', () => {
  it('calcule la moyenne par cours, la moyenne globale et la distribution', async () => {
    db.grade.findMany.mockResolvedValue([
      gradeFixture({ value: 10 }),
      gradeFixture({ value: 20 }),
    ]);
    const req = { params: { classId: 'class-1' }, gradeUser: { userId: 'admin-1', email: '', role: 'ADMIN' } } as unknown as GetClassStatsRequest;
    const reply = buildReply();

    await statsController.getClassStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const call = (reply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(call.data.average).toBe(15);
    expect(call.data.byCourse).toHaveLength(1);
    expect(call.data.byCourse[0].average).toBe(15);
    expect(call.data.byCourse[0].gradedCount).toBe(2);
    expect(call.data.distribution).toHaveLength(5);
  });

  it("renvoie 403 si un TEACHER demande une classe qu'il n'enseigne pas", async () => {
    getClassIdsForTeacher.mockResolvedValue(['other-class']);
    const req = { params: { classId: 'class-1' }, gradeUser: { userId: 'teacher-1', email: '', role: 'TEACHER' } } as unknown as GetClassStatsRequest;
    const reply = buildReply();

    await statsController.getClassStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(db.grade.findMany).not.toHaveBeenCalled();
  });

  it('autorise un TEACHER qui enseigne la classe demandée', async () => {
    getClassIdsForTeacher.mockResolvedValue(['class-1']);
    db.grade.findMany.mockResolvedValue([gradeFixture()]);
    const req = { params: { classId: 'class-1' }, gradeUser: { userId: 'teacher-1', email: '', role: 'TEACHER' } } as unknown as GetClassStatsRequest;
    const reply = buildReply();

    await statsController.getClassStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
  });
});

describe('getUserStats', () => {
  it('renvoie 404 si l’utilisateur est introuvable', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const req = { params: { userId: 'missing' } } as unknown as GetUserStatsRequest;
    const reply = buildReply();

    await statsController.getUserStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it('calcule moyenne, tendance et rang', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
    db.grade.findMany.mockImplementation((args: { where?: { userId?: string } }) => {
      if (args.where?.userId === 'user-1') {
        return Promise.resolve([
          gradeFixture({ value: 10, assignment: { assignedAt: new Date('2026-06-01T00:00:00Z'), coefficient: 1 } }),
          gradeFixture({ value: 20, assignment: { assignedAt: new Date('2026-06-02T00:00:00Z'), coefficient: 1 } }),
        ]);
      }
      // roster de la classe pour le rang
      return Promise.resolve([
        gradeFixture({ userId: 'user-1', value: 15, assignment: { coefficient: 1 } }),
        gradeFixture({ userId: 'user-2', value: 18, assignment: { coefficient: 1 } }),
      ]);
    });

    const req = { params: { userId: 'user-1' } } as unknown as GetUserStatsRequest;
    const reply = buildReply();

    await statsController.getUserStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const call = (reply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(call.data.average).toBe(15);
    expect(call.data.trend).toHaveLength(2);
    expect(call.data.trend[0].average).toBe(10);
    expect(call.data.trend[1].average).toBe(15);
    expect(call.data.rank).toEqual({ position: 2, totalStudents: 2 });
  });
});

describe('getAssignmentStats', () => {
  it('calcule min, max, moyenne et médiane', async () => {
    db.grade.count.mockResolvedValue(3);
    db.grade.findMany.mockResolvedValue([
      gradeFixture({ value: 5 }),
      gradeFixture({ value: 10 }),
      gradeFixture({ value: 15 }),
    ]);
    const req = {
      params: { assignmentId: 'assignment-1' },
      gradeUser: { userId: 'admin-1', email: '', role: 'ADMIN' },
    } as unknown as GetAssignmentStatsRequest;
    const reply = buildReply();

    await statsController.getAssignmentStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const call = (reply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(call.data).toEqual({
      assignmentId: 'assignment-1',
      gradedCount: 3,
      totalCount: 3,
      min: 5,
      max: 15,
      average: 10,
      median: 10,
    });
  });

  it('renvoie des null quand aucune note GRADED', async () => {
    db.grade.count.mockResolvedValue(5);
    db.grade.findMany.mockResolvedValue([]);
    const req = {
      params: { assignmentId: 'assignment-1' },
      gradeUser: { userId: 'admin-1', email: '', role: 'ADMIN' },
    } as unknown as GetAssignmentStatsRequest;
    const reply = buildReply();

    await statsController.getAssignmentStats(req, reply);

    const call = (reply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(call.data.gradedCount).toBe(0);
    expect(call.data.min).toBeNull();
    expect(call.data.max).toBeNull();
    expect(call.data.average).toBeNull();
    expect(call.data.median).toBeNull();
  });

  it("renvoie 404 si l'assignment est introuvable", async () => {
    db.assignment.findUnique.mockResolvedValue(null);
    const req = {
      params: { assignmentId: 'missing' },
      gradeUser: { userId: 'admin-1', email: '', role: 'ADMIN' },
    } as unknown as GetAssignmentStatsRequest;
    const reply = buildReply();

    await statsController.getAssignmentStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(db.grade.findMany).not.toHaveBeenCalled();
  });

  it("renvoie 403 si un TEACHER n'enseigne pas le cours de l'assignment", async () => {
    teacherTeachesCourse.mockResolvedValue(false);
    const req = {
      params: { assignmentId: 'assignment-1' },
      gradeUser: { userId: 'teacher-1', email: '', role: 'TEACHER' },
    } as unknown as GetAssignmentStatsRequest;
    const reply = buildReply();

    await statsController.getAssignmentStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(db.grade.findMany).not.toHaveBeenCalled();
  });

  it("autorise un TEACHER qui enseigne le cours de l'assignment", async () => {
    teacherTeachesCourse.mockResolvedValue(true);
    db.grade.count.mockResolvedValue(0);
    db.grade.findMany.mockResolvedValue([]);
    const req = {
      params: { assignmentId: 'assignment-1' },
      gradeUser: { userId: 'teacher-1', email: '', role: 'TEACHER' },
    } as unknown as GetAssignmentStatsRequest;
    const reply = buildReply();

    await statsController.getAssignmentStats(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(teacherTeachesCourse).toHaveBeenCalledWith('class-1', 'teacher-1', 'course-1');
  });
});
