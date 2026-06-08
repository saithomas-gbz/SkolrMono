import { describe, it, expect, beforeEach, mock } from 'bun:test';
import subjectController from '../controllers/subjectController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type { CreateSubjectBody, UpdateSubjectBody } from '../controllers/subjectController';

mock.module('../generated/prisma/client', () => ({
  PrismaClient: class {
    subject = {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    };
  },
}));

mock.module('../db', () => ({
  default: {
    subject: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
  },
}));

const prismaMock = db as {
  subject: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
};

const sampleSubject = {
  id: 'subject-1',
  name: 'Sciences',
  description: 'Matière sciences',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  courses: [],
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

describe('SubjectController', () => {
  const mockReply = {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    prismaMock.subject.findUnique.mockReset();
    prismaMock.subject.findMany.mockReset();
    prismaMock.subject.create.mockReset();
    prismaMock.subject.update.mockReset();
    prismaMock.subject.delete.mockReset();

    (mockReply.status as ReturnType<typeof mock>).mockReset();
    (mockReply.send as ReturnType<typeof mock>).mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReturnThis();
  });

  // ---------------------------------------------------------------------------
  // getAllSubjects
  // ---------------------------------------------------------------------------
  describe('getAllSubjects', () => {
    it('should return all subjects', async () => {
      prismaMock.subject.findMany.mockResolvedValue([sampleSubject]);
      const req = createMockRequest();
      await subjectController.getAllSubjects(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [sampleSubject],
        message: 'Subjects fetched successfully',
      });
    });

    it('should return 500 on database error', async () => {
      prismaMock.subject.findMany.mockRejectedValue(new Error('db error'));
      const req = createMockRequest();
      await subjectController.getAllSubjects(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getSubjectById
  // ---------------------------------------------------------------------------
  describe('getSubjectById', () => {
    it('should return a subject with its courses', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(sampleSubject);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'subject-1' } });
      await subjectController.getSubjectById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleSubject,
        message: 'Subject fetched successfully',
      });
    });

    it('should return 404 when subject is not found', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await subjectController.getSubjectById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Subject not found' });
    });

    it('should return 500 on database error', async () => {
      prismaMock.subject.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'subject-1' } });
      await subjectController.getSubjectById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // createSubject
  // ---------------------------------------------------------------------------
  describe('createSubject', () => {
    it('should create and return a subject', async () => {
      const body: CreateSubjectBody = { name: 'Sciences', description: 'Matière sciences' };
      prismaMock.subject.create.mockResolvedValue(sampleSubject);
      const req = createMockRequest<{ Body: CreateSubjectBody }>({ body });
      await subjectController.createSubject(req, mockReply);
      expect(prismaMock.subject.create).toHaveBeenCalledWith({
        data: { name: body.name, description: body.description },
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleSubject,
        message: 'Subject created successfully',
      });
    });

    it('should return 500 on database error', async () => {
      const body: CreateSubjectBody = { name: 'Sciences', description: 'Matière sciences' };
      prismaMock.subject.create.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Body: CreateSubjectBody }>({ body });
      await subjectController.createSubject(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // updateSubject
  // ---------------------------------------------------------------------------
  describe('updateSubject', () => {
    it('should update and return the subject', async () => {
      const body: UpdateSubjectBody = { name: 'Lettres', description: 'Matière lettres' };
      const updated = { ...sampleSubject, ...body };
      prismaMock.subject.findUnique.mockResolvedValue(sampleSubject);
      prismaMock.subject.update.mockResolvedValue(updated);
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateSubjectBody }>({
        params: { id: 'subject-1' },
        body,
      });
      await subjectController.updateSubject(req, mockReply);
      expect(prismaMock.subject.update).toHaveBeenCalledWith({
        where: { id: 'subject-1' },
        data: { name: body.name, description: body.description },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: updated,
        message: 'Subject updated successfully',
      });
    });

    it('should return 404 when subject is not found', async () => {
      const body: UpdateSubjectBody = { name: 'Lettres' };
      prismaMock.subject.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateSubjectBody }>({
        params: { id: 'missing' },
        body,
      });
      await subjectController.updateSubject(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Subject not found' });
      expect(prismaMock.subject.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const body: UpdateSubjectBody = { name: 'Lettres' };
      prismaMock.subject.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateSubjectBody }>({
        params: { id: 'subject-1' },
        body,
      });
      await subjectController.updateSubject(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteSubject
  // ---------------------------------------------------------------------------
  describe('deleteSubject', () => {
    it('should delete and return the subject', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(sampleSubject);
      prismaMock.subject.delete.mockResolvedValue(sampleSubject);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'subject-1' } });
      await subjectController.deleteSubject(req, mockReply);
      expect(prismaMock.subject.delete).toHaveBeenCalledWith({ where: { id: 'subject-1' } });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleSubject,
        message: 'Subject deleted successfully',
      });
    });

    it('should return 404 when subject is not found', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await subjectController.deleteSubject(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Subject not found' });
      expect(prismaMock.subject.delete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.subject.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'subject-1' } });
      await subjectController.deleteSubject(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
