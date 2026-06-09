import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';

const publishMock = mock();

mock.module('@skolr/rabbitmq', () => ({
  publish: publishMock,
  ROUTING_KEYS: {
    GRADE_CREATED: 'grade.created',
  },
}));

const teacherTeachesCourseMock = mock();
mock.module('../lib/classServiceClient', () => ({
  teacherTeachesCourse: teacherTeachesCourseMock,
}));

mock.module('../db', () => ({
  default: {
    grade: { create: mock(), findUnique: mock() },
    assignment: { findUnique: mock() },
    user: { findUnique: mock() },
    class: { findUnique: mock() },
    course: { findUnique: mock() },
  },
}));

import gradeController from '../controllers/gradeController';
import db from '../db';

const prismaMock = db as {
  grade: { create: ReturnType<typeof mock>; findUnique: ReturnType<typeof mock> };
  assignment: { findUnique: ReturnType<typeof mock> };
  user: { findUnique: ReturnType<typeof mock> };
  class: { findUnique: ReturnType<typeof mock> };
  course: { findUnique: ReturnType<typeof mock> };
};

const sampleCreatedGrade = {
  id: 'grade-42',
  assignmentId: 'assign-1',
  userId: 'user-1',
  classId: 'class-1',
  courseId: 'course-1',
  value: 14,
  status: 'GRADED',
  comment: null,
  createdAt: new Date('2026-06-09T10:00:00.000Z'),
  updatedAt: new Date('2026-06-09T10:00:00.000Z'),
  user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', classId: 'class-1' },
  class: { id: 'class-1', name: 'CM2-A', description: '' },
  course: { id: 'course-1', name: 'Maths', description: '' },
};

function makeRequest<T extends RouteGenericInterface = RouteGenericInterface>(
  overrides: Partial<Pick<FastifyRequest<T>, 'body' | 'params'>> = {},
): FastifyRequest<T> {
  return {
    body: (overrides.body ?? {}) as FastifyRequest<T>['body'],
    params: (overrides.params ?? {}) as FastifyRequest<T>['params'],
    log: { error: mock() },
  } as FastifyRequest<T>;
}

const mockReply = {
  status: mock().mockReturnThis(),
  send: mock().mockReturnThis(),
} as unknown as FastifyReply;

describe('gradeController — RabbitMQ publisher', () => {
  beforeEach(() => {
    publishMock.mockReset();
    teacherTeachesCourseMock.mockReset();
    prismaMock.grade.create.mockReset();
    prismaMock.assignment.findUnique.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.class.findUnique.mockReset();
    prismaMock.course.findUnique.mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReset().mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReset().mockReturnThis();
  });

  it('publishes grade.created after successful grade creation', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assign-1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    teacherTeachesCourseMock.mockResolvedValue(true);
    prismaMock.grade.create.mockResolvedValue(sampleCreatedGrade);
    publishMock.mockResolvedValue(undefined);

    const req = makeRequest({
      body: {
        assignmentId: 'assign-1',
        userId: 'user-1',
        classId: 'class-1',
        courseId: 'course-1',
        value: 14,
        status: 'GRADED',
        teacherId: 'teacher-1',
      },
    });

    await gradeController.createGrade(req, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledWith('grade.created', {
      gradeId: 'grade-42',
      assignmentId: 'assign-1',
      userId: 'user-1',
      classId: 'class-1',
      courseId: 'course-1',
      value: 14,
      status: 'GRADED',
      teacherId: 'teacher-1',
      createdAt: '2026-06-09T10:00:00.000Z',
    });
  });

  it('does not publish if teacher is not authorized', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assign-1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    teacherTeachesCourseMock.mockResolvedValue(false);

    const req = makeRequest({
      body: {
        assignmentId: 'assign-1',
        userId: 'user-1',
        classId: 'class-1',
        courseId: 'course-1',
        value: 14,
        teacherId: 'teacher-unauthorized',
      },
    });

    await gradeController.createGrade(req, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(403);
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('does not publish if grade creation fails', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assign-1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    teacherTeachesCourseMock.mockResolvedValue(true);
    prismaMock.grade.create.mockRejectedValue(new Error('db error'));

    const req = makeRequest({
      body: {
        assignmentId: 'assign-1',
        userId: 'user-1',
        classId: 'class-1',
        courseId: 'course-1',
        value: 14,
        teacherId: 'teacher-1',
      },
    });

    await gradeController.createGrade(req, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(publishMock).not.toHaveBeenCalled();
  });
});
