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
      findMany: mock(),
      update: mock(),
    },
    classStudent: {
      findMany: mock(),
    },
    course: {
      findMany: mock(),
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
    findMany: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
  classStudent: {
    findMany: ReturnType<typeof mock>;
  };
  course: {
    findMany: ReturnType<typeof mock>;
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
    prismaMock.classTeacher.findMany.mockReset();
    prismaMock.classTeacher.update.mockReset();
    prismaMock.course.findMany.mockReset();
    prismaMock.classStudent.findMany.mockReset();
  });

  describe('updateClassStudentList', () => {
    it("n'annonce que les inscriptions reelles", async () => {
      // La liste etait reconstruite entierement : chaque modification emettait un
      // `student.enrolled` pour toute la classe, donc une notification par eleve
      // deja inscrit, et repartait la date d'inscription de chacun.
      prismaMock.classStudent.findMany.mockResolvedValue([
        { id: 'cs-1', classId: 'c-1', studentId: 'e-1' },
        { id: 'cs-2', classId: 'c-1', studentId: 'e-2' },
      ]);
      prismaMock.class.update.mockResolvedValue({ id: 'c-1', classTeachers: [], students: [] });

      const request = createMockRequest({
        params: { id: 'c-1' },
        body: { studentIds: ['e-1', 'e-2', 'e-3'] },
      });
      await classController.updateClassStudentList(request as never, mockReply);

      const donnees = prismaMock.class.update.mock.calls[0]![0].data.students;
      expect(donnees.deleteMany).toBeUndefined();
      expect(donnees.create).toHaveLength(1);
      expect(donnees.create[0].studentId).toBe('e-3');
    });
  });

  describe('updateClassTeacherList', () => {
    it("conserve l'affectation de cours d'un enseignant reconduit", async () => {
      // Le code reconstruisait la liste par deleteMany + create. La ligne
      // ClassTeacher portant la relation `courses`, reaffecter les enseignants
      // effacait qui enseignait quoi — y compris pour ceux simplement reconduits.
      prismaMock.classTeacher.findMany.mockResolvedValue([
        { id: 'ct-1', classId: 'c-1', teacherId: 't-1', isPrincipal: true },
        { id: 'ct-2', classId: 'c-1', teacherId: 't-2', isPrincipal: false },
      ]);
      prismaMock.class.update.mockResolvedValue({ id: 'c-1', classTeachers: [], students: [] });

      const request = createMockRequest({ params: { id: 'c-1' }, body: { teacherIds: ['t-1', 't-3'] } });
      await classController.updateClassTeacherList(request as never, mockReply);

      const donnees = prismaMock.class.update.mock.calls[0]![0].data.classTeachers;
      // t-2 part, t-3 arrive, t-1 est reconduit sans etre recree.
      expect(donnees.deleteMany).toEqual({ id: { in: ['ct-2'] } });
      expect(donnees.create).toHaveLength(1);
      expect(donnees.create[0].teacherId).toBe('t-3');
    });
  });

  describe('setTeacherCoursesInClass', () => {
    it("refuse un cours inconnu plutot que de l'ignorer", async () => {
      // `connect` sur un identifiant inexistant echouerait ou passerait en
      // silence : l'administrateur croirait l'affectation faite.
      prismaMock.classTeacher.findUnique.mockResolvedValue({ id: 'ct-1' });
      prismaMock.course.findMany.mockResolvedValue([{ id: 'co-1' }]);

      const request = createMockRequest({
        params: { classId: 'c-1', teacherId: 't-1' },
        body: { courseIds: ['co-1', 'co-inconnu'] },
      });
      await classController.setTeacherCoursesInClass(request as never, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.classTeacher.update).not.toHaveBeenCalled();
    });

    it("404 si l'enseignant n'est pas affecte a la classe", async () => {
      prismaMock.classTeacher.findUnique.mockResolvedValue(null);

      const request = createMockRequest({
        params: { classId: 'c-1', teacherId: 't-inconnu' },
        body: { courseIds: [] },
      });
      await classController.setTeacherCoursesInClass(request as never, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
    });
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
