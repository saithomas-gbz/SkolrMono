import { describe, it, expect, beforeEach, mock } from 'bun:test';
import classController from '../controllers/classController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type { ClassData } from '../controllers/classController';

mock.module('../generated/prisma/client', () => ({
  PrismaClient: class {
    class = {
      findUnique: mock(),
      findFirst: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock()
    };
  }
}));

mock.module('../db', () => ({
  default: {
    class: {
      findUnique: mock(),
      findFirst: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock()
    }
  }
}));

const prismaMock = db as {
  class: {
    findUnique: ReturnType<typeof mock>;
    findFirst: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
};

function createMockRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
  overrides: Partial<Pick<FastifyRequest<RouteGeneric>, 'body' | 'params'>> = {}
): FastifyRequest<RouteGeneric> {
  return {
    body: (overrides.body ?? {}) as FastifyRequest<RouteGeneric>['body'],
    params: (overrides.params ?? {}) as FastifyRequest<RouteGeneric>['params'],
    log: { error: mock() }
  } as FastifyRequest<RouteGeneric>;
}

describe('ClassController', () => {
  const mockReply = {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis()
  } as unknown as FastifyReply;

  beforeEach(() => {
    prismaMock.class.findUnique.mockReset();
    prismaMock.class.findFirst.mockReset();
    prismaMock.class.findMany.mockReset();
    prismaMock.class.create.mockReset();
    prismaMock.class.update.mockReset();
    prismaMock.class.delete.mockReset();
  });

  describe('getAllClasses', () => {
    it('should return all classes', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      const req = createMockRequest();
      await classController.getAllClasses(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: [], message: 'Classes fetched successfully' });
    });
  });
  describe('getClassById', () => {
    it('should return a class by id', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: '1', name: 'Class 1', description: 'Description 1' });
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: '1' } });
      await classController.getClassById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: { id: '1', name: 'Class 1', description: 'Description 1' }, message: 'Class fetched successfully' });
    });
  });
  describe('getClassByTeacherId', () => {
    it('should return classes by teacher id', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      const req = createMockRequest<{ Params: { teacherId: string } }>({ params: { teacherId: 't1' } });
      await classController.getClassByTeacherId(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: [], message: 'Classes fetched successfully' });
    });
  });
  describe('createClass', () => {
    it('should create a class', async () => {
      prismaMock.class.create.mockResolvedValue({ id: '1', name: 'Class 1', description: 'Description 1' });
      const body = {
        name: 'Class 1',
        description: 'Description 1',
        teacherIds: ['teacher-1'],
        studentIds: ['student-1']
      };
      const req = createMockRequest<{ Body: typeof body }>({ body });
      await classController.createClass(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({ data: { id: '1', name: 'Class 1', description: 'Description 1' }, message: 'Class created successfully' });
    });
  });
  describe('updateClassNameOrDescription', () => {
    it('should update a class name or description', async () => {
      prismaMock.class.update.mockResolvedValue({ id: '1', name: 'Class 1', description: 'Description 1' });
      const body: ClassData = { name: 'Class 1', description: 'Description 1' };
      const req = createMockRequest<{ Params: { id: string }; Body: ClassData }>({
        params: { id: '1' },
        body
      });
      await classController.updateClassNameOrDescription(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: { id: '1', name: 'Class 1', description: 'Description 1' }, message: 'Class updated successfully' });
    });
  });
  describe('updateClassTeacherList', () => {
    it('should update a class teacher list', async () => {
      prismaMock.class.update.mockResolvedValue({ id: '1', name: 'Class 1', description: 'Description 1' });
      const req = createMockRequest<{ Params: { id: string }; Body: { teacherIds: string[] } }>({
        params: { id: '1' },
        body: { teacherIds: ['t1'] }
      });
      await classController.updateClassTeacherList(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: { id: '1', name: 'Class 1', description: 'Description 1' }, message: 'Class updated successfully' });
    });
  });
  describe('updateClassStudentList', () => {
    it('should update a class student list', async () => {
      prismaMock.class.update.mockResolvedValue({ id: '1', name: 'Class 1', description: 'Description 1' });
      const req = createMockRequest<{ Params: { id: string }; Body: { studentIds: string[] } }>({
        params: { id: '1' },
        body: { studentIds: ['s1'] }
      });
      await classController.updateClassStudentList(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: { id: '1', name: 'Class 1', description: 'Description 1' }, message: 'Class updated successfully' });
    });
  });
  describe('deleteClass', () => {
    it('should delete a class', async () => {
      prismaMock.class.delete.mockResolvedValue({ id: '1', name: 'Class 1', description: 'Description 1' });
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: '1' } });
      await classController.deleteClass(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: { id: '1', name: 'Class 1', description: 'Description 1' }, message: 'Class deleted successfully' });
    });
  });
});
