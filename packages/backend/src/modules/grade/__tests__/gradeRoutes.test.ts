import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import gradeRoutes from '../routes/gradeRoutes';
import db from '../db';

const teacherTeachesCourseMock = mock();
const getClassIdsForTeacherMock = mock();

mock.module('../lib/classServiceClient', () => ({
  teacherTeachesCourse: teacherTeachesCourseMock,
  getClassIdsForTeacher: getClassIdsForTeacherMock,
}));

// Le contrôleur appelle publish(...).catch(...). shared/events est mocké
// globalement par d'autres fichiers de la suite (mock.module est global au
// process) — on l'ancre ici pour que ces tests ne dépendent pas de l'ordre
// de chargement (sinon un mock voisin renvoyant non-Promise casse le .catch).
mock.module('../../../shared/events', () => ({
  publish: mock(() => Promise.resolve()),
}));

mock.module('../generated/prisma/client', () => ({
  PrismaClient: class {
    grade = { findUnique: mock(), findMany: mock(), create: mock(), update: mock(), delete: mock() };
    assignment = { findUnique: mock() };
    user = { findUnique: mock() };
    class = { findUnique: mock() };
    course = { findUnique: mock() };
  },
}));

mock.module('../db', () => ({
  default: {
    grade: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
    assignment: {
      findUnique: mock(),
    },
    user: {
      findUnique: mock(),
    },
    class: {
      findUnique: mock(),
    },
    course: {
      findUnique: mock(),
    },
  },
}));

const prismaMock = db as {
  grade: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  assignment: {
    findUnique: ReturnType<typeof mock>;
  };
  user: {
    findUnique: ReturnType<typeof mock>;
  };
  class: {
    findUnique: ReturnType<typeof mock>;
  };
  course: {
    findUnique: ReturnType<typeof mock>;
  };
};

const sampleGrade = {
  id: 'grade-1',
  assignmentId: 'assignment-1',
  userId: 'user-1',
  classId: 'class-1',
  courseId: 'course-1',
  status: 'GRADED',
  value: 15.5,
  comment: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  user: {
    id: 'user-1',
    name: 'Dev Student',
    email: 'dev.student@skolr.local',
    classId: 'class-1',
  },
  class: {
    id: 'class-1',
    name: 'CM2-A',
    description: 'Demo class',
  },
  course: {
    id: 'course-1',
    name: 'Mathématiques',
    description: 'Demo course',
  },
};

async function buildTestApp() {
  const app = Fastify();

  // Artefact du harnais, pas du code applicatif — même parade que
  // `planningRoutes.test.ts`, où il est décrit en détail : sur une route DELETE,
  // `deny()` fait `await reply.send(...)`, `Reply.then` s'abonne à
  // `eos(reply.raw)` que light-my-request fait rejeter une fois la réponse
  // écrite, et Fastify retente alors un writeHead (ERR_HTTP_HEADERS_SENT). Le
  // statut reçu par le client est bien 401/403 et le handler ne tourne pas.
  app.setErrorHandler((err, _request, reply) => {
    if ((err as { code?: string }).code === 'ERR_HTTP_HEADERS_SENT') return reply;
    return reply.status(500).send({ error: err.message });
  });

  await app.register(fastifyJwt, { secret: 'test-secret' });
  await app.register(gradeRoutes);
  await app.ready();
  return app;
}

function authHeader(app: Awaited<ReturnType<typeof buildTestApp>>, payload: Record<string, unknown>) {
  return { authorization: `Bearer ${app.jwt.sign(payload)}` };
}

const teacherPayload = { userId: 'teacher-1', email: 'prof@skolr.local', role: 'TEACHER' };
const studentPayload = { userId: 'user-1', email: 'eleve@skolr.local', role: 'USER' };
const adminPayload = { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN' };

describe('GradeRoutes', () => {
  beforeEach(() => {
    prismaMock.grade.findUnique.mockReset();
    prismaMock.grade.findMany.mockReset();
    prismaMock.grade.create.mockReset();
    prismaMock.grade.update.mockReset();
    prismaMock.grade.delete.mockReset();
    prismaMock.assignment.findUnique.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.class.findUnique.mockReset();
    prismaMock.course.findUnique.mockReset();
    teacherTeachesCourseMock.mockReset();
    getClassIdsForTeacherMock.mockReset();
    // Par défaut l'enseignant est dans son périmètre : les cas nominaux testent
    // le handler, pas le garde. Les cas hors périmètre le redéfinissent.
    teacherTeachesCourseMock.mockResolvedValue(true);
    getClassIdsForTeacherMock.mockResolvedValue(['class-1']);
  });

  it('GET /grades returns all grades for a TEACHER', async () => {
    prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/grades',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [sampleGrade], message: 'Grades fetched successfully' });
    await app.close();
  });

  it('GET /grades/:id returns a grade for a TEACHER', async () => {
    prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/grades/grade-1',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: sampleGrade, message: 'Grade fetched successfully' });
    await app.close();
  });

  it('GET /grades/:id returns 404 when grade is missing', async () => {
    prismaMock.grade.findUnique.mockResolvedValue(null);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/grades/missing',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Grade not found' });
    await app.close();
  });

  it('GET /grades/class/:classId returns grades for class for a TEACHER', async () => {
    prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/grades/class/class-1',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [sampleGrade], message: 'Grades fetched successfully' });
    await app.close();
  });

  it('GET /grades/user/:userId allows a USER to fetch their own grades', async () => {
    prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/grades/user/user-1',
      headers: authHeader(app, studentPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [sampleGrade], message: 'Grades fetched successfully' });
    await app.close();
  });

  it('GET /grades/user/:userId allows a TEACHER to fetch any student\'s grades', async () => {
    prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/grades/user/user-1',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('POST /grades creates a grade for a TEACHER', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1', classId: 'class-1', courseId: 'course-1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    teacherTeachesCourseMock.mockResolvedValue(true);
    prismaMock.grade.create.mockResolvedValue(sampleGrade);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/grades',
      headers: authHeader(app, teacherPayload),
      payload: {
        assignmentId: 'assignment-1',
        userId: 'user-1',
        classId: 'class-1',
        courseId: 'course-1',
        value: 16,
        teacherId: 'teacher-1',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ data: sampleGrade, message: 'Grade created successfully' });
    await app.close();
  });

  it('POST /grades returns 400 when user does not belong to class', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1', classId: 'class-1', courseId: 'course-1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'other-class' });
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/grades',
      headers: authHeader(app, teacherPayload),
      payload: {
        assignmentId: 'assignment-1',
        userId: 'user-1',
        classId: 'class-1',
        courseId: 'course-1',
        value: 16,
        teacherId: 'teacher-1',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'User does not belong to this class' });
    await app.close();
  });

  it('PATCH /grades/:id updates a grade for a TEACHER', async () => {
    prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
    prismaMock.grade.update.mockResolvedValue({ ...sampleGrade, value: 18 });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/grades/grade-1',
      headers: authHeader(app, teacherPayload),
      payload: { value: 18 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      data: { ...sampleGrade, value: 18 },
      message: 'Grade updated successfully',
    });
    await app.close();
  });

  it('DELETE /grades/:id deletes a grade for an ADMIN', async () => {
    prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
    prismaMock.grade.delete.mockResolvedValue(sampleGrade);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/grades/grade-1',
      headers: authHeader(app, adminPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: sampleGrade, message: 'Grade deleted successfully' });
    await app.close();
  });

  it('DELETE /grades/:id refuse un enseignant, y compris dans son périmètre', async () => {
    prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/grades/grade-1',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(403);
    expect(prismaMock.grade.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.grade.delete).not.toHaveBeenCalled();
    await app.close();
  });
  describe('périmètre enseignant (#234)', () => {
    // Hors périmètre : l'enseignant n'enseigne pas ce cours dans cette classe.
    const outOfScope = () => {
      teacherTeachesCourseMock.mockResolvedValue(false);
      getClassIdsForTeacherMock.mockResolvedValue(['another-class']);
    };

    it('GET /grades/:id refuse un enseignant hors de son périmètre', async () => {
      outOfScope();
      prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/grades/grade-1',
        headers: authHeader(app, teacherPayload),
      });
      expect(res.statusCode).toBe(403);
      await app.close();
    });

    it('GET /grades/class/:classId refuse un enseignant hors de son périmètre', async () => {
      outOfScope();
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/grades/class/class-1',
        headers: authHeader(app, teacherPayload),
      });
      expect(res.statusCode).toBe(403);
      expect(prismaMock.grade.findMany).not.toHaveBeenCalled();
      await app.close();
    });

    it('PATCH /grades/:id refuse un enseignant hors de son périmètre', async () => {
      outOfScope();
      prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/grades/grade-1',
        headers: authHeader(app, teacherPayload),
        payload: { value: 18 },
      });
      expect(res.statusCode).toBe(403);
      expect(prismaMock.grade.update).not.toHaveBeenCalled();
      await app.close();
    });

    it('GET /grades restreint la liste aux classes de l\'enseignant', async () => {
      getClassIdsForTeacherMock.mockResolvedValue(['class-1', 'class-2']);
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/grades',
        headers: authHeader(app, teacherPayload),
      });
      expect(res.statusCode).toBe(200);
      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { classId: { in: ['class-1', 'class-2'] } } }),
      );
      await app.close();
    });

    it('GET /grades ne filtre pas pour un ADMIN', async () => {
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/grades',
        headers: authHeader(app, adminPayload),
      });
      expect(res.statusCode).toBe(200);
      expect(getClassIdsForTeacherMock).not.toHaveBeenCalled();
      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      await app.close();
    });

    it('PATCH /grades/:id laisse passer un ADMIN sans verifier son perimetre', async () => {
      outOfScope();
      prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
      prismaMock.grade.update.mockResolvedValue({ ...sampleGrade, value: 18 });
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/grades/grade-1',
        headers: authHeader(app, adminPayload),
        payload: { value: 18 },
      });
      expect(res.statusCode).toBe(200);
      await app.close();
    });

    it('POST /grades ignore un teacherId du corps pour un enseignant', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1', classId: 'class-1', courseId: 'course-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
      prismaMock.grade.create.mockResolvedValue(sampleGrade);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'POST',
        url: '/grades',
        headers: authHeader(app, teacherPayload),
        payload: {
          assignmentId: 'assignment-1',
          userId: 'user-1',
          classId: 'class-1',
          courseId: 'course-1',
          value: 16,
          // Identifiant d'un collegue : doit etre ignore au profit du jeton.
          teacherId: 'teacher-999',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(teacherTeachesCourseMock).toHaveBeenCalledWith('class-1', 'teacher-1', 'course-1');
      await app.close();
    });
  });
  describe('trous fermes apres review (#234)', () => {
    it('GET /grades/user/:id restreint un enseignant a ses classes', async () => {
      getClassIdsForTeacherMock.mockResolvedValue(['class-1']);
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/grades/user/user-1',
        headers: authHeader(app, teacherPayload),
      });

      expect(res.statusCode).toBe(200);
      // Sans ce filtre, un prof lisait toutes les notes de l'eleve, toutes
      // classes et toutes matieres confondues.
      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', classId: { in: ['class-1'] } } }),
      );
      await app.close();
    });

    it('GET /grades/user/:id ne filtre pas pour un eleve consultant ses notes', async () => {
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'GET',
        url: '/grades/user/user-1',
        headers: authHeader(app, studentPayload),
      });

      expect(res.statusCode).toBe(200);
      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      await app.close();
    });

    it('POST /grades refuse un couple classe/cours different de celui du devoir', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        classId: 'class-9',
        courseId: 'course-9',
      });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
      const app = await buildTestApp();
      const res = await app.inject({
        method: 'POST',
        url: '/grades',
        headers: authHeader(app, teacherPayload),
        payload: {
          assignmentId: 'assignment-1',
          userId: 'user-1',
          // Couple ou l'enseignant est legitime, mais qui n'est pas celui du devoir.
          classId: 'class-1',
          courseId: 'course-1',
          value: 16,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(prismaMock.grade.create).not.toHaveBeenCalled();
      await app.close();
    });
  });
});
