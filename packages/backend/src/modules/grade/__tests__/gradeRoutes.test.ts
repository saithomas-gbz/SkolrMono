import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import gradeRoutes from '../routes/gradeRoutes';
import db from '../db';

const teacherTeachesCourseMock = mock();

mock.module('../lib/classServiceClient', () => ({
  teacherTeachesCourse: teacherTeachesCourseMock,
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
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
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
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
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

  it('DELETE /grades/:id deletes a grade for a TEACHER', async () => {
    prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
    prismaMock.grade.delete.mockResolvedValue(sampleGrade);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/grades/grade-1',
      headers: authHeader(app, teacherPayload),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: sampleGrade, message: 'Grade deleted successfully' });
    await app.close();
  });
});
