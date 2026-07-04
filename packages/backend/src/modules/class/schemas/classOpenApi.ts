const classTag = 'class';

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const classTeacher = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    classId: { type: 'string' },
    teacherId: { type: 'string' },
    isPrincipal: { type: 'boolean' },
  },
  required: ['id', 'classId', 'teacherId', 'isPrincipal'],
} as const;

const classStudent = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    classId: { type: 'string' },
    studentId: { type: 'string' },
    joinedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'classId', 'studentId', 'joinedAt'],
} as const;

const classEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    establishmentId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    classTeachers: { type: 'array', items: classTeacher },
    students: { type: 'array', items: classStudent },
  },
  required: ['id', 'name', 'description', 'createdAt', 'updatedAt', 'classTeachers', 'students'],
} as const;

const classResponse = {
  type: 'object',
  properties: {
    data: classEntity,
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const classListResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: classEntity },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const classSummaryEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    teacherCount: { type: 'integer' },
    studentCount: { type: 'integer' },
  },
  required: ['id', 'name', 'teacherCount', 'studentCount'],
} as const;

const classSummaryListResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: classSummaryEntity },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const classCourse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['id', 'name', 'description'],
} as const;

const classCourseListResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: classCourse },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

export const getClassesSummarySchema = {
  description: 'List classes with id, name, teacherCount and studentCount (lightweight, for selectors)',
  tags: [classTag],
  response: {
    200: classSummaryListResponse,
    500: errorBody,
  },
} as const;

export const getClassesByStudentIdSchema = {
  description: 'List classes where a given student is enrolled',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      studentId: { type: 'string' },
    },
    required: ['studentId'],
  },
  response: {
    200: classListResponse,
    500: errorBody,
  },
} as const;

export const getAllClassesSchema = {
  description: 'List all classes',
  tags: [classTag],
  response: {
    200: classListResponse,
    500: errorBody,
  },
} as const;

export const getClassByIdSchema = {
  description: 'Get a class by id',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: classResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const getClassesByTeacherIdSchema = {
  description: 'List classes for a given teacher id',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      teacherId: { type: 'string' },
    },
    required: ['teacherId'],
  },
  response: {
    200: classListResponse,
    500: errorBody,
  },
} as const;

export const getTeacherCoursesInClassSchema = {
  description: 'List courses a teacher is allowed to grade in a given class',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      classId: { type: 'string' },
      teacherId: { type: 'string' },
    },
    required: ['classId', 'teacherId'],
  },
  response: {
    200: classCourseListResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const createClassSchema = {
  description: 'Create a class with teachers and students',
  tags: [classTag],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      teacherIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
      studentIds: { type: 'array', items: { type: 'string' } },
    },
    required: ['name', 'description', 'teacherIds', 'studentIds'],
  },
  response: {
    201: classResponse,
    500: errorBody,
  },
} as const;

export const updateClassNameOrDescriptionSchema = {
  description: 'Update class name and/or description',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
    },
    additionalProperties: false,
  },
  response: {
    200: classResponse,
    500: errorBody,
  },
} as const;

export const updateClassTeacherListSchema = {
  description: 'Replace teacher list for a class (first teacher becomes principal)',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      teacherIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
    },
    required: ['teacherIds'],
    additionalProperties: false,
  },
  response: {
    200: classResponse,
    500: errorBody,
  },
} as const;

export const updateClassStudentListSchema = {
  description: 'Replace student list for a class',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  body: {
    type: 'object',
    properties: {
      studentIds: { type: 'array', items: { type: 'string' } },
    },
    required: ['studentIds'],
    additionalProperties: false,
  },
  response: {
    200: classResponse,
    500: errorBody,
  },
} as const;

export const deleteClassSchema = {
  description: 'Delete a class by id',
  tags: [classTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: classResponse,
    500: errorBody,
  },
} as const;

