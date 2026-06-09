import { describe, it, expect, beforeEach, mock } from 'bun:test';
import gradeController from '../controllers/gradeController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type { CreateGradeBody, UpdateGradeBody } from '../controllers/gradeController';

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
  course: {
    id: 'course-1',
    name: 'Mathématiques',
    description: 'Demo course',
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
    prismaMock.assignment.findUnique.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.class.findUnique.mockReset();
    prismaMock.course.findUnique.mockReset();
    teacherTeachesCourseMock.mockReset();

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
      assignmentId: 'assignment-1',
      userId: 'user-1',
      classId: 'class-1',
      courseId: 'course-1',
      value: 16,
      teacherId: 'teacher-1',
    };

    it('should create a grade', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
      teacherTeachesCourseMock.mockResolvedValue(true);
      prismaMock.grade.create.mockResolvedValue(sampleGrade);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleGrade,
        message: 'Grade created successfully',
      });
    });

    it('should return 404 when assignment is missing', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Assignment not found' });
    });

    it('should return 404 when user is missing', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
      prismaMock.user.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 404 when class is missing', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Class not found' });
    });

    it('should return 404 when course is missing', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.course.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should return 400 when user does not belong to class', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'other-class' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User does not belong to this class' });
    });

    it('should return 403 when teacher cannot grade the course', async () => {
      prismaMock.assignment.findUnique.mockResolvedValue({ id: 'assignment-1' });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', classId: 'class-1' });
      prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
      prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
      teacherTeachesCourseMock.mockResolvedValue(false);
      const req = createMockRequest<{ Body: CreateGradeBody }>({ body });
      await gradeController.createGrade(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Teacher is not allowed to grade this course in this class',
      });
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
