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
  subjectId: null,
  subject: null,
  relatedCourses: [],
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
    it('should create and return a course without subjectId', async () => {
      const body: CreateCourseBody = { name: 'Mathématiques', description: 'Cours de maths' };
      prismaMock.course.create.mockResolvedValue(sampleCourse);
      const req = createMockRequest<{ Body: CreateCourseBody }>({ body });
      await courseController.createCourse(req, mockReply);
      expect(prismaMock.course.create).toHaveBeenCalledWith({
        data: { name: body.name, description: body.description, subjectId: undefined },
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleCourse,
        message: 'Course created successfully',
      });
    });

    it('should create and return a course with subjectId', async () => {
      const body: CreateCourseBody = { name: 'Algèbre', description: 'Cours', subjectId: 'sub-1' };
      const courseWithSubject = { ...sampleCourse, subjectId: 'sub-1' };
      prismaMock.course.create.mockResolvedValue(courseWithSubject);
      const req = createMockRequest<{ Body: CreateCourseBody }>({ body });
      await courseController.createCourse(req, mockReply);
      expect(prismaMock.course.create).toHaveBeenCalledWith({
        data: { name: body.name, description: body.description, subjectId: 'sub-1' },
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
    });

    it('should return 500 on database error', async () => {
      const body: CreateCourseBody = { name: 'Mathématiques', description: 'Cours de maths' };
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
    it('should update and return the course', async () => {
      const body: UpdateCourseBody = { name: 'Sciences', description: 'Cours de sciences' };
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
        data: { name: body.name, description: body.description, subjectId: undefined },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: updated,
        message: 'Course updated successfully',
      });
    });

    it('should update subjectId when provided', async () => {
      const body: UpdateCourseBody = { subjectId: 'sub-1' };
      const updated = { ...sampleCourse, subjectId: 'sub-1' };
      prismaMock.course.findUnique.mockResolvedValue(sampleCourse);
      prismaMock.course.update.mockResolvedValue(updated);
      const req = createMockRequest<{ Params: { id: string }; Body: UpdateCourseBody }>({
        params: { id: 'course-1' },
        body,
      });
      await courseController.updateCourse(req, mockReply);
      expect(prismaMock.course.update).toHaveBeenCalledWith({
        where: { id: 'course-1' },
        data: { name: undefined, description: undefined, subjectId: 'sub-1' },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when course is not found', async () => {
      const body: UpdateCourseBody = { name: 'Sciences', description: 'Cours de sciences' };
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
      const body: UpdateCourseBody = { name: 'Sciences', description: 'Cours de sciences' };
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

  // ---------------------------------------------------------------------------
  // addRelatedCourse
  // ---------------------------------------------------------------------------
  describe('addRelatedCourse', () => {
    const sampleRelated = { ...sampleCourse, id: 'course-2', name: 'Sciences' };
    const updatedWithRelated = { ...sampleCourse, relatedCourses: [sampleRelated] };

    it('should link two courses and return the updated course', async () => {
      prismaMock.course.findUnique
        .mockResolvedValueOnce(sampleCourse)
        .mockResolvedValueOnce(sampleRelated);
      prismaMock.course.update.mockResolvedValue(updatedWithRelated);

      const req = createMockRequest<{
        Params: { id: string };
        Body: { relatedCourseId: string };
      }>({ params: { id: 'course-1' }, body: { relatedCourseId: 'course-2' } });

      await courseController.addRelatedCourse(req, mockReply);

      expect(prismaMock.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'course-1' },
          data: { relatedCourses: { connect: { id: 'course-2' } } },
        }),
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: updatedWithRelated,
        message: 'Related course added successfully',
      });
    });

    it('should return 400 when linking a course to itself', async () => {
      const req = createMockRequest<{
        Params: { id: string };
        Body: { relatedCourseId: string };
      }>({ params: { id: 'course-1' }, body: { relatedCourseId: 'course-1' } });

      await courseController.addRelatedCourse(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'A course cannot be linked to itself' });
      expect(prismaMock.course.update).not.toHaveBeenCalled();
    });

    it('should return 404 when the source course is not found', async () => {
      prismaMock.course.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(sampleRelated);

      const req = createMockRequest<{
        Params: { id: string };
        Body: { relatedCourseId: string };
      }>({ params: { id: 'missing' }, body: { relatedCourseId: 'course-2' } });

      await courseController.addRelatedCourse(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
      expect(prismaMock.course.update).not.toHaveBeenCalled();
    });

    it('should return 404 when the related course is not found', async () => {
      prismaMock.course.findUnique
        .mockResolvedValueOnce(sampleCourse)
        .mockResolvedValueOnce(null);

      const req = createMockRequest<{
        Params: { id: string };
        Body: { relatedCourseId: string };
      }>({ params: { id: 'course-1' }, body: { relatedCourseId: 'missing' } });

      await courseController.addRelatedCourse(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Related course not found' });
      expect(prismaMock.course.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findUnique.mockRejectedValue(new Error('db error'));

      const req = createMockRequest<{
        Params: { id: string };
        Body: { relatedCourseId: string };
      }>({ params: { id: 'course-1' }, body: { relatedCourseId: 'course-2' } });

      await courseController.addRelatedCourse(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // removeRelatedCourse
  // ---------------------------------------------------------------------------
  describe('removeRelatedCourse', () => {
    it('should unlink a related course and return the updated course', async () => {
      prismaMock.course.findUnique.mockResolvedValue(sampleCourse);
      prismaMock.course.update.mockResolvedValue(sampleCourse);

      const req = createMockRequest<{ Params: { id: string; relatedId: string } }>({
        params: { id: 'course-1', relatedId: 'course-2' },
      });

      await courseController.removeRelatedCourse(req, mockReply);

      expect(prismaMock.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'course-1' },
          data: { relatedCourses: { disconnect: { id: 'course-2' } } },
        }),
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleCourse,
        message: 'Related course removed successfully',
      });
    });

    it('should return 404 when the source course is not found', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);

      const req = createMockRequest<{ Params: { id: string; relatedId: string } }>({
        params: { id: 'missing', relatedId: 'course-2' },
      });

      await courseController.removeRelatedCourse(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
      expect(prismaMock.course.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findUnique.mockRejectedValue(new Error('db error'));

      const req = createMockRequest<{ Params: { id: string; relatedId: string } }>({
        params: { id: 'course-1', relatedId: 'course-2' },
      });

      await courseController.removeRelatedCourse(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
