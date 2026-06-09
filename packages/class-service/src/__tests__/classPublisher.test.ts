import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';

const publishMock = mock();

mock.module('@skolr/rabbitmq', () => ({
  publish: publishMock,
  ROUTING_KEYS: {
    STUDENT_ENROLLED: 'student.enrolled',
  },
}));

mock.module('../db', () => ({
  default: {
    class: {
      findUnique: mock(),
      create: mock(),
      update: mock(),
    },
  },
}));

import classController from '../controllers/classController';
import db from '../db';

const prismaMock = db as {
  class: {
    findUnique: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
};

const sampleClass = {
  id: 'class-1',
  name: 'CM2-A',
  description: 'Classe test',
  classTeachers: [{ id: 'ct-1', teacherId: 'teacher-1', isPrincipal: true }],
  students: [
    { id: 'cs-1', studentId: 'student-1' },
    { id: 'cs-2', studentId: 'student-2' },
  ],
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

describe('classController — RabbitMQ publisher', () => {
  beforeEach(() => {
    publishMock.mockReset();
    prismaMock.class.create.mockReset();
    prismaMock.class.update.mockReset();
    prismaMock.class.findUnique.mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReset().mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReset().mockReturnThis();
  });

  describe('createClass', () => {
    it('publishes student.enrolled for each student on class creation', async () => {
      prismaMock.class.create.mockResolvedValue(sampleClass);
      publishMock.mockResolvedValue(undefined);

      const req = makeRequest({
        body: {
          name: 'CM2-A',
          description: 'Classe test',
          teacherIds: ['teacher-1'],
          studentIds: ['student-1', 'student-2'],
        },
      });

      await classController.createClass(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(publishMock).toHaveBeenCalledTimes(2);
      expect(publishMock).toHaveBeenCalledWith('student.enrolled', expect.objectContaining({
        studentId: 'student-1',
        classId: 'class-1',
        className: 'CM2-A',
      }));
      expect(publishMock).toHaveBeenCalledWith('student.enrolled', expect.objectContaining({
        studentId: 'student-2',
        classId: 'class-1',
        className: 'CM2-A',
      }));
    });

    it('does not publish if class creation fails', async () => {
      prismaMock.class.create.mockRejectedValue(new Error('db error'));

      const req = makeRequest({
        body: {
          name: 'CM2-A',
          description: '',
          teacherIds: ['teacher-1'],
          studentIds: ['student-1'],
        },
      });

      await classController.createClass(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(publishMock).not.toHaveBeenCalled();
    });
  });

  describe('updateClassStudentList', () => {
    it('publishes student.enrolled for each student after update', async () => {
      prismaMock.class.update.mockResolvedValue(sampleClass);
      publishMock.mockResolvedValue(undefined);

      const req = makeRequest({
        params: { id: 'class-1' },
        body: { studentIds: ['student-1', 'student-2'] },
      });

      await classController.updateClassStudentList(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(publishMock).toHaveBeenCalledTimes(2);
      expect(publishMock).toHaveBeenCalledWith('student.enrolled', expect.objectContaining({
        studentId: 'student-1',
        classId: 'class-1',
        className: 'CM2-A',
      }));
    });
  });
});
