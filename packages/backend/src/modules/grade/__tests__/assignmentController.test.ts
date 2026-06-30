import { describe, it, expect, beforeEach, mock } from 'bun:test';
import assignmentController from '../controllers/assignmentController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import type {
  CreateAssignmentBody,
  UpdateAssignmentBody,
  BatchUpdateGradesBody,
} from '../controllers/assignmentController';

const teacherTeachesCourseMock = mock();

mock.module('../lib/classServiceClient', () => ({
  teacherTeachesCourse: teacherTeachesCourseMock,
}));

mock.module('../db', () => ({
  default: {
    assignment: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
    grade: {
      findUnique: mock(),
      findMany: mock(),
      upsert: mock(),
    },
    user: {
      findUnique: mock(),
      findMany: mock(),
    },
    class: {
      findUnique: mock(),
    },
    course: {
      findUnique: mock(),
    },
    $transaction: mock(),
  },
}));

const prismaMock = db as {
  assignment: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  grade: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    upsert: ReturnType<typeof mock>;
  };
  user: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
  };
  class: {
    findUnique: ReturnType<typeof mock>;
  };
  course: {
    findUnique: ReturnType<typeof mock>;
  };
  $transaction: ReturnType<typeof mock>;
};

function createMockRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
  overrides: Partial<Pick<FastifyRequest<RouteGeneric>, 'body' | 'params' | 'query'>> = {},
): FastifyRequest<RouteGeneric> {
  return {
    body: (overrides.body ?? {}) as FastifyRequest<RouteGeneric>['body'],
    params: (overrides.params ?? {}) as FastifyRequest<RouteGeneric>['params'],
    query: (overrides.query ?? {}) as FastifyRequest<RouteGeneric>['query'],
    log: { error: mock() },
  } as unknown as FastifyRequest<RouteGeneric>;
}

const mockReply = {
  status: mock().mockReturnThis(),
  send: mock().mockReturnThis(),
} as unknown as FastifyReply;

const sampleAssignment = {
  id: 'assignment-1',
  title: 'Contrôle chapitre 1',
  description: null,
  classId: 'class-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  assignedAt: new Date('2026-06-01T08:00:00Z'),
  dueAt: null,
  maxScore: 20,
  coefficient: 1,
  status: 'DRAFT',
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  class: { id: 'class-1', name: 'CM2-A' },
  course: { id: 'course-1', name: 'Mathématiques' },
};

const sampleGrade = {
  id: 'grade-1',
  assignmentId: 'assignment-1',
  userId: 'user-1',
  classId: 'class-1',
  courseId: 'course-1',
  status: 'PENDING',
  value: null,
  comment: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-1', name: 'Léa Martin' },
};

beforeEach(() => {
  (mockReply.status as ReturnType<typeof mock>).mockClear().mockReturnValue(mockReply);
  (mockReply.send as ReturnType<typeof mock>).mockClear().mockReturnValue(mockReply);
  teacherTeachesCourseMock.mockReset();
  Object.values(prismaMock.assignment).forEach((m) => (m as ReturnType<typeof mock>).mockReset());
  Object.values(prismaMock.grade).forEach((m) => (m as ReturnType<typeof mock>).mockReset());
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.findMany.mockReset();
  prismaMock.class.findUnique.mockReset();
  prismaMock.course.findUnique.mockReset();
  prismaMock.$transaction.mockReset();
});

describe('getAssignments', () => {
  it('returns a list of assignments', async () => {
    prismaMock.assignment.findMany.mockResolvedValue([sampleAssignment]);
    const req = createMockRequest({ query: {} });
    await assignmentController.getAssignments(req as FastifyRequest<{ Querystring: Record<string, unknown> }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(200);
    expect(mockReply.send).toHaveBeenCalledWith({
      data: [sampleAssignment],
      message: 'Assignments fetched successfully',
    });
  });
});

describe('getAssignmentById', () => {
  it('returns assignment when found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(sampleAssignment);
    const req = createMockRequest({ params: { id: 'assignment-1' } });
    await assignmentController.getAssignmentById(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(200);
    expect(mockReply.send).toHaveBeenCalledWith({
      data: sampleAssignment,
      message: 'Assignment fetched successfully',
    });
  });

  it('returns 404 when not found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = createMockRequest({ params: { id: 'missing' } });
    await assignmentController.getAssignmentById(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({ error: 'Assignment not found' });
  });
});

describe('createAssignment', () => {
  const body: CreateAssignmentBody = {
    title: 'Contrôle chapitre 1',
    classId: 'class-1',
    courseId: 'course-1',
    teacherId: 'teacher-1',
    assignedAt: '2026-06-01T08:00:00Z',
  };

  it('creates assignment when teacher is authorized', async () => {
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    teacherTeachesCourseMock.mockResolvedValue(true);
    prismaMock.assignment.create.mockResolvedValue(sampleAssignment);

    const req = createMockRequest({ body });
    await assignmentController.createAssignment(req as FastifyRequest<{ Body: CreateAssignmentBody }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith({
      data: sampleAssignment,
      message: 'Assignment created successfully',
    });
  });

  it('returns 403 when teacher is not authorized', async () => {
    prismaMock.class.findUnique.mockResolvedValue({ id: 'class-1' });
    prismaMock.course.findUnique.mockResolvedValue({ id: 'course-1' });
    teacherTeachesCourseMock.mockResolvedValue(false);

    const req = createMockRequest({ body });
    await assignmentController.createAssignment(req as FastifyRequest<{ Body: CreateAssignmentBody }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when class not found', async () => {
    prismaMock.class.findUnique.mockResolvedValue(null);
    const req = createMockRequest({ body });
    await assignmentController.createAssignment(req as FastifyRequest<{ Body: CreateAssignmentBody }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({ error: 'Class not found' });
  });
});

describe('updateAssignment', () => {
  it('updates assignment metadata', async () => {
    const updated = { ...sampleAssignment, title: 'Contrôle modifié' };
    prismaMock.assignment.findUnique.mockResolvedValue(sampleAssignment);
    prismaMock.assignment.update.mockResolvedValue(updated);

    const req = createMockRequest<{ Params: { id: string }; Body: UpdateAssignmentBody }>({
      params: { id: 'assignment-1' },
      body: { title: 'Contrôle modifié' },
    });
    await assignmentController.updateAssignment(
      req as FastifyRequest<{ Params: { id: string }; Body: UpdateAssignmentBody }>,
      mockReply,
    );
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when assignment not found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = createMockRequest<{ Params: { id: string }; Body: UpdateAssignmentBody }>({
      params: { id: 'missing' },
      body: { title: 'Test' },
    });
    await assignmentController.updateAssignment(
      req as FastifyRequest<{ Params: { id: string }; Body: UpdateAssignmentBody }>,
      mockReply,
    );
    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});

describe('publishAssignment', () => {
  it('returns 400 when assignment is not DRAFT', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ ...sampleAssignment, status: 'PUBLISHED' });
    const req = createMockRequest({ params: { id: 'assignment-1' } });
    await assignmentController.publishAssignment(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({ error: 'Only DRAFT assignments can be published' });
  });

  it('returns 404 when assignment not found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = createMockRequest({ params: { id: 'missing' } });
    await assignmentController.publishAssignment(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});

describe('batchUpdateGrades', () => {
  it('returns 400 when assignment is CLOSED', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ ...sampleAssignment, status: 'CLOSED' });
    const req = createMockRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>({
      params: { id: 'assignment-1' },
      body: { entries: [{ userId: 'user-1', status: 'GRADED', value: 15 }] },
    });
    await assignmentController.batchUpdateGrades(
      req as FastifyRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>,
      mockReply,
    );
    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockReply.send).toHaveBeenCalledWith({ error: 'Assignment is closed, grades are read-only' });
  });

  it('returns 400 when GRADED entry has no value', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({ ...sampleAssignment, status: 'PUBLISHED' });
    const req = createMockRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>({
      params: { id: 'assignment-1' },
      body: { entries: [{ userId: 'user-1', status: 'GRADED' }] },
    });
    await assignmentController.batchUpdateGrades(
      req as FastifyRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>,
      mockReply,
    );
    expect(mockReply.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when assignment not found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = createMockRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>({
      params: { id: 'missing' },
      body: { entries: [] },
    });
    await assignmentController.batchUpdateGrades(
      req as FastifyRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>,
      mockReply,
    );
    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});

describe('getGradeGrid', () => {
  it('returns grade grid for an assignment', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(sampleAssignment);
    prismaMock.grade.findMany.mockResolvedValue([sampleGrade]);
    const req = createMockRequest({ params: { id: 'assignment-1' } });
    await assignmentController.getGradeGrid(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(200);
    const call = (mockReply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
    expect(call?.data.rows).toHaveLength(1);
    expect(call?.data.rows[0].name).toBe('Léa Martin');
  });

  it('returns 404 when assignment not found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = createMockRequest({ params: { id: 'missing' } });
    await assignmentController.getGradeGrid(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});

describe('deleteAssignment', () => {
  it('deletes an assignment', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(sampleAssignment);
    prismaMock.assignment.delete.mockResolvedValue(sampleAssignment);
    const req = createMockRequest({ params: { id: 'assignment-1' } });
    await assignmentController.deleteAssignment(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when not found', async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);
    const req = createMockRequest({ params: { id: 'missing' } });
    await assignmentController.deleteAssignment(req as FastifyRequest<{ Params: { id: string } }>, mockReply);
    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});
