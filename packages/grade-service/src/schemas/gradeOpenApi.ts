const gradeTag = 'grade';

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const gradeUser = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    classId: { type: 'string' },
  },
  required: ['id', 'name', 'email', 'classId'],
} as const;

const gradeClass = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['id', 'name', 'description'],
} as const;

const gradeCourse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['id', 'name', 'description'],
} as const;

const gradeEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    classId: { type: 'string' },
    courseId: { type: 'string' },
    value: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    user: gradeUser,
    class: gradeClass,
    course: gradeCourse,
  },
  required: ['id', 'userId', 'classId', 'courseId', 'value', 'createdAt', 'updatedAt'],
} as const;

const gradeResponse = {
  type: 'object',
  properties: {
    data: gradeEntity,
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const gradeListResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: gradeEntity },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

export const getAllGradesSchema = {
  description: 'List all grades',
  tags: [gradeTag],
  response: {
    200: gradeListResponse,
    500: errorBody,
  },
} as const;

export const getGradeByIdSchema = {
  description: 'Get a grade by id',
  tags: [gradeTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: gradeResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const getGradesByClassIdSchema = {
  description: 'List grades for a given class id',
  tags: [gradeTag],
  params: {
    type: 'object',
    properties: {
      classId: { type: 'string' },
    },
    required: ['classId'],
  },
  response: {
    200: gradeListResponse,
    500: errorBody,
  },
} as const;

export const getGradesByUserIdSchema = {
  description: 'List grades for a given user id',
  tags: [gradeTag],
  params: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
    required: ['userId'],
  },
  response: {
    200: gradeListResponse,
    500: errorBody,
  },
} as const;

export const createGradeSchema = {
  description: 'Create a grade for a user in a class',
  tags: [gradeTag],
  body: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      classId: { type: 'string' },
      courseId: { type: 'string' },
      value: { type: 'number' },
      teacherId: { type: 'string' },
    },
    required: ['userId', 'classId', 'courseId', 'value', 'teacherId'],
  },
  response: {
    201: gradeResponse,
    400: errorBody,
    403: errorBody,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const updateGradeSchema = {
  description: 'Update a grade value',
  tags: [gradeTag],
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
      value: { type: 'number' },
    },
    required: ['value'],
    additionalProperties: false,
  },
  response: {
    200: gradeResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const deleteGradeSchema = {
  description: 'Delete a grade by id',
  tags: [gradeTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: gradeResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;
