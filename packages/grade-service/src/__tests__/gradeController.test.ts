import { describe, it, expect, beforeEach, mock } from 'bun:test';
import gradeController from '../controllers/gradeController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type { CreateGradeBody, UpdateGradeBody } from '../controllers/gradeController';

mock.module('../generated/prisma/client', () => ({
  PrismaClient: class {
    grade = { findUnique: mock(), findMany: mock(), create: mock(), update: mock(), delete: mock() };
    user = { findUnique: mock() };
    class = { findUnique: mock() };
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
    user: {
      findUnique: mock(),
    },
    class: {
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
  user: {
    findUnique: ReturnType<typeof mock>;
  };
  class: {
    findUnique: ReturnType<typeof mock>;
  };
};

const sampleGrade = {
  id: 'grade-1',
  userId: 'user-1',
  classId: 'class-1',
  value: 15.5,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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
};

function createMockRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
  overrides: Partial<Pick<FastifyRequest<RouteGeneric>, 'body' | 'params'>> = {},
): FastifyRequest<RouteGeneric> {
  return {
    body: (overrides.body ?? {}) as FastifyRequest<RouteGeneric>['body'],
    params: (overrides.params ?? {}) as FastifyRequest<RouteGeneric>['params'],
    log: { error: mock() },
  } as FastifyRequest<RouteGeneric>;
}

describe('GradeController', () => {
  const mockReply = {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    prismaMock.grade.findUnique.mockReset();
    prismaMock.grade.findMany.mockReset();
    prismaMock.grade.create.mockReset();
    prismaMock.grade.update.mockReset();
    prismaMock.grade.delete.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.class.findUnique.mockReset();

    (mockReply.status as ReturnType<typeof mock>).mockReset();
    (mockReply.send as ReturnType<typeof mock>).mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReturnThis();
  });

  describe('getAllGrades', () => {
    it('should return all grades', async () => {
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const req = createMockRequest();
      await gradeController.getAllGrades(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [sampleGrade],
        message: 'Grades fetched successfully',
      });
    });

    it('should return 500 on database error', async () => {
      prismaMock.grade.findMany.mockRejectedValue(new Error('db error'));
      const req = createMockRequest();
      await gradeController.getAllGrades(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getGradeById', () => {
    it('should return a grade by id', async () => {
      prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'grade-1' } });
      await gradeController.getGradeById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleGrade,
        message: 'Grade fetched successfully',
      });
    });

    it('should return 404 when grade is missing', async () => {
      prismaMock.grade.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await gradeController.getGradeById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Grade not found' });
    });
  });

  describe('getGradesByClassId', () => {
    it('should return grades for a class', async () => {
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const req = createMockRequest<{ Params: { classId: string } }>({ params: { classId: 'class-1' } });
      await gradeController.getGradesByClassId(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [sampleGrade],
        message: 'Grades fetched successfully',
      });
    });
  });

  describe('getGradesByUserId', () => {
    it('should return grades for a user', async () => {
      prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
      const req = createMockRequest<{ Params: { userId: string } }>({ params: { userId: 'user-1' } });
      await gradeController.getGradesByUserId(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [sampleGrade],
        message: 'Grades fetched successfully',
      });
    });
  });

  describe('createGrade', () => {
    const body: CreateGradeBody = {
      userId: 'user-1',
      classId: 'class-1',
      value: 16,
    };

    it('should create a grade', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.grade.create.mockResolvedValue(sampleGrade);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleGrade,
        message: 'Grade created successfully',
      });
    });

    it('should return 404 when user is missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 404 when class is missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Class not found' });
    });

    it('should return 400 when user does not belong to class', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'other-class' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User does not belong to this class' });
    });
  });

  describe('updateGrade', () => {
    it('should update a grade value', async () => {
      prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
      prismaMock.grade.update.mockResolvedValue({ ...sampleGrade, value: 18 });
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateGradeBody }>({
        params: { id: 'grade-1' },
        body: { value: 18 },
      });
      await gradeController.updateGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: { ...sampleGrade, value: 18 },
        message: 'Grade updated successfully',
      });
    });

    it('should return 404 when grade is missing', async () => {
      prismaMock.grade.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateGradeBody }>({
        params: { id: 'missing' },
        body: { value: 18 },
      });
      await gradeController.updateGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Grade not found' });
    });
  });

  describe('deleteGrade', () => {
    it('should delete a grade', async () => {
      prismaMock.grade.findUnique.mockResolvedValue(sampleGrade);
      prismaMock.grade.delete.mockResolvedValue(sampleGrade);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'grade-1' } });
      await gradeController.deleteGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleGrade,
        message: 'Grade deleted successfully',
      });
    });

    it('should return 404 when grade is missing', async () => {
      prismaMock.grade.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await gradeController.deleteGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Grade not found' });
    });
  });
});
