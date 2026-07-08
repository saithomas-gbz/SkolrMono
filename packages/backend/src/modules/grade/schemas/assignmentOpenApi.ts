const assignmentTag = 'assignment';

const errorBody = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
} as const;

const assignmentClassRef = {
  type: 'object',
  properties: { id: { type: 'string' }, name: { type: 'string' } },
  required: ['id', 'name'],
} as const;

const assignmentCourseRef = {
  type: 'object',
  properties: { id: { type: 'string' }, name: { type: 'string' } },
  required: ['id', 'name'],
} as const;

const assignmentEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    classId: { type: 'string' },
    courseId: { type: 'string' },
    teacherId: { type: 'string' },
    assignedAt: { type: 'string', format: 'date-time' },
    dueAt: { type: 'string', format: 'date-time', nullable: true },
    maxScore: { type: 'number' },
    coefficient: { type: 'number' },
    status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
    class: assignmentClassRef,
    course: assignmentCourseRef,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    /** Renseignés uniquement par la liste (dashboard enseignant, issue #97). */
    gradedCount: { type: 'number' },
    totalCount: { type: 'number' },
  },
  required: ['id', 'title', 'classId', 'courseId', 'teacherId', 'assignedAt', 'maxScore', 'coefficient', 'status', 'createdAt', 'updatedAt'],
} as const;

const assignmentResponse = {
  type: 'object',
  properties: { data: assignmentEntity, message: { type: 'string' } },
  required: ['data', 'message'],
} as const;

const assignmentListResponse = {
  type: 'object',
  properties: { data: { type: 'array', items: assignmentEntity }, message: { type: 'string' } },
  required: ['data', 'message'],
} as const;

const gradeInGrid = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['PENDING', 'GRADED', 'ABSENT', 'EXEMPT'] },
    value: { type: 'number', nullable: true },
    comment: { type: 'string', nullable: true },
  },
  required: ['id', 'status'],
} as const;

const gradeGridRow = {
  type: 'object',
  properties: {
    userId: { type: 'string' },
    name: { type: 'string' },
    grade: gradeInGrid,
  },
  required: ['userId', 'name', 'grade'],
} as const;

const gradeGridResponse = {
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        assignment: assignmentEntity,
        rows: { type: 'array', items: gradeGridRow },
        gradedCount: { type: 'number' },
        totalCount: { type: 'number' },
      },
      required: ['assignment', 'rows', 'gradedCount', 'totalCount'],
    },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const idParam = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const;

export const createAssignmentSchema = {
  description: 'Create a new assignment (devoir)',
  tags: [assignmentTag],
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      classId: { type: 'string' },
      courseId: { type: 'string' },
      teacherId: { type: 'string' },
      assignedAt: { type: 'string', format: 'date-time' },
      dueAt: { type: 'string', format: 'date-time' },
      maxScore: { type: 'number' },
      coefficient: { type: 'number' },
    },
    required: ['title', 'classId', 'courseId', 'teacherId', 'assignedAt'],
  },
  response: { 201: assignmentResponse, 400: errorBody, 403: errorBody, 404: errorBody, 500: errorBody },
} as const;

export const getAssignmentsSchema = {
  description: 'List assignments with optional filters',
  tags: [assignmentTag],
  querystring: {
    type: 'object',
    properties: {
      classId: { type: 'string' },
      courseId: { type: 'string' },
      teacherId: { type: 'string' },
      status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
    },
  },
  response: { 200: assignmentListResponse, 500: errorBody },
} as const;

export const getAssignmentByIdSchema = {
  description: 'Get assignment by id',
  tags: [assignmentTag],
  params: idParam,
  response: { 200: assignmentResponse, 404: errorBody, 500: errorBody },
} as const;

export const updateAssignmentSchema = {
  description: 'Update assignment metadata or status',
  tags: [assignmentTag],
  params: idParam,
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      assignedAt: { type: 'string', format: 'date-time' },
      dueAt: { type: 'string', format: 'date-time' },
      maxScore: { type: 'number' },
      coefficient: { type: 'number' },
      status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CLOSED'] },
    },
    additionalProperties: false,
  },
  response: { 200: assignmentResponse, 400: errorBody, 404: errorBody, 500: errorBody },
} as const;

export const deleteAssignmentSchema = {
  description: 'Delete an assignment (cascades to grades)',
  tags: [assignmentTag],
  params: idParam,
  response: { 200: assignmentResponse, 404: errorBody, 500: errorBody },
} as const;

export const publishAssignmentSchema = {
  description: 'Publish a DRAFT assignment — creates PENDING grades for all class students',
  tags: [assignmentTag],
  params: idParam,
  response: { 200: assignmentResponse, 400: errorBody, 404: errorBody, 500: errorBody },
} as const;

export const getGradeGridSchema = {
  description: 'Get grade grid for an assignment (all students + their grades)',
  tags: [assignmentTag],
  params: idParam,
  response: { 200: gradeGridResponse, 404: errorBody, 500: errorBody },
} as const;

export const batchUpdateGradesSchema = {
  description: 'Batch update grades for an assignment (all-or-nothing transaction)',
  tags: [assignmentTag],
  params: idParam,
  body: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'GRADED', 'ABSENT', 'EXEMPT'] },
            value: { type: 'number' },
            comment: { type: 'string' },
          },
          required: ['userId', 'status'],
        },
      },
    },
    required: ['entries'],
  },
  response: {
    200: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
    400: errorBody,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const getGradebookSchema = {
  description: 'Get gradebook matrix for a class (students × assignments)',
  tags: [assignmentTag],
  params: {
    type: 'object',
    properties: { classId: { type: 'string' } },
    required: ['classId'],
  },
  querystring: {
    type: 'object',
    properties: { courseId: { type: 'string' } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            classId: { type: 'string' },
            courseId: { type: 'string', nullable: true },
            assignments: { type: 'array', items: assignmentEntity },
            students: {
              type: 'array',
              items: {
                type: 'object',
                properties: { userId: { type: 'string' }, name: { type: 'string' } },
                required: ['userId', 'name'],
              },
            },
            grades: { type: 'object' },
          },
          required: ['classId', 'assignments', 'students', 'grades'],
        },
        message: { type: 'string' },
      },
      required: ['data', 'message'],
    },
    404: errorBody,
    500: errorBody,
  },
} as const;
