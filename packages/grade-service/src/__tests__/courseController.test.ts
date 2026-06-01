import { describe, it, expect, beforeEach, mock } from 'bun:test';
import courseController from '../controllers/courseController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type { CreateCourseBody, UpdateCourseBody } from '../controllers/courseController';

mock.module('../generated/prisma/client', () => ({
  PrismaClient: class {
    course = {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      deleteMany: mock(),
    };
  },
}));

mock.module('../db', () => ({
  default: {
    course: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      deleteMany: mock(),
    },
  },
}));

const prismaMock = db as {
  course: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    deleteMany: ReturnType<typeof mock>;
  };
};

const sampleCourse = {
  id: 'course-1',
  name: 'Mathématiques',
  description: 'Cours de maths niveau CM2',
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

describe('CourseController', () => {
  const mockReply = {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    prismaMock.course.findUnique.mockReset();
    prismaMock.course.findMany.mockReset();
    prismaMock.course.create.mockReset();
    prismaMock.course.update.mockReset();
    prismaMock.course.delete.mockReset();
    prismaMock.course.deleteMany.mockReset();

    (mockReply.status as ReturnType<typeof mock>).mockReset();
    (mockReply.send as ReturnType<typeof mock>).mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReturnThis();
  });

  // ---------------------------------------------------------------------------
  // getAllCourses
  // ---------------------------------------------------------------------------
  describe('getAllCourses', () => {
    it('should return all courses', async () => {
      prismaMock.course.findMany.mockResolvedValue([sampleCourse]);
      const req = createMockRequest();
      await courseController.getAllCourses(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [sampleCourse],
        message: 'Courses fetched successfully',
      });
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findMany.mockRejectedValue(new Error('db error'));
      const req = createMockRequest();
      await courseController.getAllCourses(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getCourseById
  // ---------------------------------------------------------------------------
  describe('getCourseById', () => {
    it('should return a course by id', async () => {
      prismaMock.course.findUnique.mockResolvedValue(sampleCourse);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'course-1' } });
      await courseController.getCourseById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleCourse,
        message: 'Course fetched successfully',
      });
    });

    it('should return 404 when course is not found', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await courseController.getCourseById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'course-1' } });
      await courseController.getCourseById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // createCourse
  // ---------------------------------------------------------------------------
  describe('createCourse', () => {
    const body: CreateCourseBody = { name: 'Mathématiques', description: 'Cours de maths' };

    it('should create and return a course', async () => {
      prismaMock.course.create.mockResolvedValue(sampleCourse);
      const req = createMockRequest<{ Body: CreateCourseBody }>({ body });
      await courseController.createCourse(req, mockReply);
      expect(prismaMock.course.create).toHaveBeenCalledWith({
        data: { name: body.name, description: body.description },
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleCourse,
        message: 'Course created successfully',
      });
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.create.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Body: CreateCourseBody }>({ body });
      await courseController.createCourse(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // updateCourse
  // ---------------------------------------------------------------------------
  describe('updateCourse', () => {
    const body: UpdateCourseBody = { name: 'Sciences', description: 'Cours de sciences' };

    it('should update and return the course', async () => {
      const updated = { ...sampleCourse, ...body };
      prismaMock.course.findUnique.mockResolvedValue(sampleCourse);
      prismaMock.course.update.mockResolvedValue(updated);
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateCourseBody }>({
        params: { id: 'course-1' },
        body,
      });
      await courseController.updateCourse(req, mockReply);
      expect(prismaMock.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { name: body.name, description: body.description },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: updated,
        message: 'Course updated successfully',
      });
    });

    it('should return 404 when course is not found', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateCourseBody }>({
        params: { id: 'missing' },
        body,
      });
      await courseController.updateCourse(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
      expect(prismaMock.course.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateCourseBody }>({
        params: { id: 'course-1' },
        body,
      });
      await courseController.updateCourse(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteCourse
  // ---------------------------------------------------------------------------
  describe('deleteCourse', () => {
    it('should delete and return the course', async () => {
      prismaMock.course.findUnique.mockResolvedValue(sampleCourse);
      prismaMock.course.delete.mockResolvedValue(sampleCourse);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'course-1' } });
      await courseController.deleteCourse(req, mockReply);
      expect(prismaMock.course.delete).toHaveBeenCalledWith({ where: { id: 'course-1' } });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleCourse,
        message: 'Course deleted successfully',
      });
    });

    it('should return 404 when course is not found', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await courseController.deleteCourse(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
      expect(prismaMock.course.delete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'course-1' } });
      await courseController.deleteCourse(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // massDeleteCourses
  // ---------------------------------------------------------------------------
  describe('massDeleteCourses', () => {
    it('should delete multiple courses and return count', async () => {
      prismaMock.course.deleteMany.mockResolvedValue({ count: 2 });
      const req = createMockRequest<{ Body: { ids: string[] } }>({
        body: { ids: ['course-1', 'course-2'] },
      });
      await courseController.massDeleteCourses(req, mockReply);
      expect(prismaMock.course.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['course-1', 'course-2'] } },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: '2 course(s) deleted successfully',
        count: 2,
      });
    });

    it('should return 400 when ids array is empty', async () => {
      const req = createMockRequest<{ Body: { ids: string[] } }>({ body: { ids: [] } });
      await courseController.massDeleteCourses(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'No IDs provided' });
      expect(prismaMock.course.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 when ids is missing', async () => {
      const req = createMockRequest<{ Body: { ids: string[] } }>({ body: {} as { ids: string[] } });
      await courseController.massDeleteCourses(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'No IDs provided' });
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.deleteMany.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Body: { ids: string[] } }>({
        body: { ids: ['course-1'] },
      });
      await courseController.massDeleteCourses(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
