import { describe, it, expect, beforeEach, mock } from 'bun:test';
import classController from '../controllers/classController';
import db from '../../../shared/db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type { ClassData } from '../controllers/classController';

mock.module('../../../generated/prisma/client', () => ({
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

mock.module('../../../shared/db', () => ({
  default: {
    class: {
      findUnique: mock(),
      findFirst: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock()
    },
    classTeacher: {
      findUnique: mock(),
    },
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
  classTeacher: {
    findUnique: ReturnType<typeof mock>;
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
    prismaMock.classTeacher.findUnique.mockReset();
  });

  describe('getClassesSummary', () => {
    it('should return id, name, teacherCount and studentCount', async () => {
      prismaMock.class.findMany.mockResolvedValue([
        { id: '1', name: 'CM2-A', _count: { classTeachers: 2, students: 10 } },
      ]);
      const req = createMockRequest();
      await classController.getClassesSummary(req, mockReply);
      expect(prismaMock.class.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, _count: { select: { classTeachers: true, students: true } } },
        orderBy: { name: 'asc' },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [{ id: '1', name: 'CM2-A', teacherCount: 2, studentCount: 10 }],
        message: 'Classes summary fetched successfully',
      });
    });

    it('should always return data as an array', async () => {
      prismaMock.class.findMany.mockResolvedValue(null);
      const req = createMockRequest();
      await classController.getClassesSummary(req, mockReply);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [],
        message: 'Classes summary fetched successfully',
      });
    });
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

    it('should reject reserved path segment summary with 404', async () => {
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'summary' } });
      await classController.getClassById(req, mockReply);
      expect(prismaMock.class.findUnique).not.toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Class not found' });
    });

    it('should reject reserved path segment student with 404', async () => {
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'student' } });
      await classController.getClassById(req, mockReply);
      expect(prismaMock.class.findUnique).not.toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Class not found' });
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

  describe('getClassesByStudentId', () => {
    it('should return classes where the student is enrolled', async () => {
      const mockClass = { id: 'c1', name: 'CM2-A', classTeachers: [], students: [{ studentId: 's1' }] };
      prismaMock.class.findMany.mockResolvedValue([mockClass]);
      const req = createMockRequest<{ Params: { studentId: string } }>({ params: { studentId: 's1' } });
      await classController.getClassesByStudentId(req, mockReply);
      expect(prismaMock.class.findMany).toHaveBeenCalledWith({
        where: { students: { some: { studentId: 's1' } } },
        include: { classTeachers: true, students: true },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: [mockClass], message: 'Classes fetched successfully' });
    });

    it('should return an empty list when student is not enrolled in any class', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      const req = createMockRequest<{ Params: { studentId: string } }>({ params: { studentId: 'unknown' } });
      await classController.getClassesByStudentId(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ data: [], message: 'Classes fetched successfully' });
    });

    it('should return 500 on db error', async () => {
      prismaMock.class.findMany.mockRejectedValue(new Error('DB error'));
      const req = createMockRequest<{ Params: { studentId: string } }>({ params: { studentId: 's1' } });
      await classController.getClassesByStudentId(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getTeacherCoursesInClass', () => {
    it('should return courses for a teacher assigned to a class', async () => {
      const courses = [{ id: 'course-1', name: 'Mathématiques', description: 'Demo' }];
      prismaMock.classTeacher.findUnique.mockResolvedValue({ id: 'ct-1', courses });
      const req = createMockRequest<{ Params: { classId: string; teacherId: string } }>({
        params: { classId: 'class-1', teacherId: 'teacher-1' },
      });
      await classController.getTeacherCoursesInClass(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: courses,
        message: 'Teacher courses fetched successfully',
      });
    });

    it('should return 404 when teacher is not assigned to the class', async () => {
      prismaMock.classTeacher.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { classId: string; teacherId: string } }>({
        params: { classId: 'class-1', teacherId: 'unknown' },
      });
      await classController.getTeacherCoursesInClass(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Teacher is not assigned to this class' });
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
