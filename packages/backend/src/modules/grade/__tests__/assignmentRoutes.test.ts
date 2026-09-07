import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';

// Tests de route : ils passent par `app.inject` et exercent donc la chaîne
// complète preHandler + contrôleur. Les tests unitaires voisins construisent un
// faux `request` sans `gradeUser`, ce qui ne peut structurellement pas couvrir
// le périmètre enseignant (#234).

const teacherTeachesCourseMock = mock();
const getClassIdsForTeacherMock = mock();
const invalidateMock = mock();

mock.module('../lib/classServiceClient', () => ({
  teacherTeachesCourse: teacherTeachesCourseMock,
  getClassIdsForTeacher: getClassIdsForTeacherMock,
}));

mock.module('../lib/ttlCache', () => ({
  getOrCompute: (_key: string, _ttlMs: number, compute: () => unknown) => compute(),
  invalidate: invalidateMock,
}));

mock.module('../db', () => ({
  default: {
    assignment: { findUnique: mock(), findMany: mock(), create: mock(), update: mock(), delete: mock() },
    grade: { findUnique: mock(), findMany: mock(), upsert: mock() },
    user: { findUnique: mock(), findMany: mock() },
    class: { findUnique: mock() },
    course: { findUnique: mock() },
    $transaction: mock(),
  },
}));

const assignmentRoutes = (await import('../routes/assignmentRoutes')).default;
const db = (await import('../db')).default as unknown as {
  assignment: Record<'findUnique' | 'findMany' | 'create' | 'update' | 'delete', ReturnType<typeof mock>>;
  grade: Record<'findUnique' | 'findMany' | 'upsert', ReturnType<typeof mock>>;
  user: Record<'findUnique' | 'findMany', ReturnType<typeof mock>>;
  class: Record<'findUnique', ReturnType<typeof mock>>;
  course: Record<'findUnique', ReturnType<typeof mock>>;
  $transaction: ReturnType<typeof mock>;
};

async function buildTestApp() {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: 'test-secret' });
  await app.register(assignmentRoutes);
  await app.ready();
  return app;
}

type TestApp = Awaited<ReturnType<typeof buildTestApp>>;

function authHeader(app: TestApp, payload: Record<string, unknown>) {
  return { authorization: `Bearer ${app.jwt.sign(payload)}` };
}

const teacher = { userId: 'teacher-1', email: 'prof@skolr.local', role: 'TEACHER' };
const admin = { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN' };

const sampleAssignment = {
  id: 'assignment-1',
  title: 'Contrôle de fractions',
  description: null,
  classId: 'class-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  assignedAt: new Date('2026-06-01T08:00:00Z'),
  dueAt: null,
  maxScore: 20,
  coefficient: 1,
  status: 'DRAFT',
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  class: { id: 'class-1', name: 'CM2-A' },
  course: { id: 'course-1', name: 'Mathématiques' },
};

beforeEach(() => {
  for (const model of [db.assignment, db.grade, db.user, db.class, db.course]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.$transaction.mockReset();
  invalidateMock.mockReset();
  teacherTeachesCourseMock.mockReset();
  getClassIdsForTeacherMock.mockReset();
  // Par défaut l'enseignant est dans son périmètre.
  teacherTeachesCourseMock.mockResolvedValue(true);
  getClassIdsForTeacherMock.mockResolvedValue(['class-1']);
});

/** Hors périmètre : ni ce cours, ni cette classe. */
function outOfScope() {
  teacherTeachesCourseMock.mockResolvedValue(false);
  getClassIdsForTeacherMock.mockResolvedValue(['another-class']);
}

describe('Périmètre enseignant sur les devoirs', () => {
  it('PATCH /assignments/:id refuse un enseignant hors périmètre', async () => {
    outOfScope();
    db.assignment.findUnique.mockResolvedValue(sampleAssignment);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/assignments/assignment-1',
      headers: authHeader(app, teacher),
      payload: { title: 'Renommé' },
    });
    expect(res.statusCode).toBe(403);
    expect(db.assignment.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('DELETE /assignments/:id refuse un enseignant hors périmètre', async () => {
    outOfScope();
    db.assignment.findUnique.mockResolvedValue(sampleAssignment);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/assignments/assignment-1',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.assignment.delete).not.toHaveBeenCalled();
    await app.close();
  });

  it('POST /assignments/:id/publish refuse un enseignant hors périmètre', async () => {
    outOfScope();
    db.assignment.findUnique.mockResolvedValue(sampleAssignment);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/assignments/assignment-1/publish',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
    await app.close();
  });

  it('GET /assignments/:id/grade-grid refuse un enseignant hors périmètre', async () => {
    outOfScope();
    db.assignment.findUnique.mockResolvedValue(sampleAssignment);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/assignments/assignment-1/grade-grid',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.grade.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('PATCH /assignments/:id/grades/batch refuse un enseignant hors périmètre', async () => {
    outOfScope();
    db.assignment.findUnique.mockResolvedValue({ ...sampleAssignment, status: 'PUBLISHED' });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/assignments/assignment-1/grades/batch',
      headers: authHeader(app, teacher),
      payload: { entries: [{ userId: 'user-1', status: 'GRADED', value: 15 }] },
    });
    expect(res.statusCode).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
    await app.close();
  });

  it('GET /classes/:classId/gradebook refuse un enseignant hors périmètre', async () => {
    outOfScope();
    db.class.findUnique.mockResolvedValue({ id: 'class-1' });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/classes/class-1/gradebook',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.assignment.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('GET /assignments restreint la liste aux classes de l\'enseignant', async () => {
    getClassIdsForTeacherMock.mockResolvedValue(['class-1', 'class-2']);
    db.assignment.findMany.mockResolvedValue([]);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/assignments',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(200);
    expect(db.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ classId: { in: ['class-1', 'class-2'] } }),
      }),
    );
    await app.close();
  });

  it('GET /assignments?classId= refuse une classe hors périmètre', async () => {
    outOfScope();
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/assignments?classId=class-1',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.assignment.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('POST /assignments ignore un teacherId du corps pour un enseignant', async () => {
    db.class.findUnique.mockResolvedValue({ id: 'class-1' });
    db.course.findUnique.mockResolvedValue({ id: 'course-1' });
    db.assignment.create.mockResolvedValue(sampleAssignment);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/assignments',
      headers: authHeader(app, teacher),
      payload: {
        title: 'Contrôle de fractions',
        classId: 'class-1',
        courseId: 'course-1',
        // Identifiant d'un collègue : doit être ignoré au profit du jeton.
        teacherId: 'teacher-999',
        assignedAt: '2026-06-01T08:00:00.000Z',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(teacherTeachesCourseMock).toHaveBeenCalledWith('class-1', 'teacher-1', 'course-1');
    expect(db.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ teacherId: 'teacher-1' }) }),
    );
    await app.close();
  });

  it('PATCH /assignments/:id laisse passer un ADMIN sans vérifier son périmètre', async () => {
    outOfScope();
    db.assignment.findUnique.mockResolvedValue(sampleAssignment);
    db.assignment.update.mockResolvedValue({ ...sampleAssignment, title: 'Renommé' });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/assignments/assignment-1',
      headers: authHeader(app, admin),
      payload: { title: 'Renommé' },
    });
    expect(res.statusCode).toBe(200);
    expect(teacherTeachesCourseMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('POST /assignments laisse un ADMIN deposer au nom d\'un enseignant', async () => {
    db.class.findUnique.mockResolvedValue({ id: 'class-1' });
    db.course.findUnique.mockResolvedValue({ id: 'course-1' });
    db.assignment.create.mockResolvedValue(sampleAssignment);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/assignments',
      headers: authHeader(app, admin),
      payload: {
        title: 'Contrôle de fractions',
        classId: 'class-1',
        courseId: 'course-1',
        teacherId: 'teacher-7',
        assignedAt: '2026-06-01T08:00:00.000Z',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(teacherTeachesCourseMock).toHaveBeenCalledWith('class-1', 'teacher-7', 'course-1');
    await app.close();
  });
});
