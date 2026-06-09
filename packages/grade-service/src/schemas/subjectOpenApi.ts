const subjectTag = 'subject';

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const subjectCourseEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['id', 'name', 'description'],
} as const;

const subjectEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
} as const;

const subjectWithCoursesEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    courses: { type: 'array', items: subjectCourseEntity },
  },
  required: ['id', 'name', 'description', 'createdAt', 'updatedAt', 'courses'],
} as const;

const subjectResponse = {
  type: 'object',
  properties: {
    data: subjectEntity,
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const subjectWithCoursesResponse = {
  type: 'object',
  properties: {
    data: subjectWithCoursesEntity,
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const subjectListResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: subjectEntity },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

export const getAllSubjectsSchema = {
  description: 'List all subjects',
  tags: [subjectTag],
  response: {
    200: subjectListResponse,
    500: errorBody,
  },
} as const;

export const getSubjectByIdSchema = {
  description: 'Get a subject by ID (includes its courses)',
  tags: [subjectTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: subjectWithCoursesResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const createSubjectSchema = {
  description: 'Create a new subject',
  tags: [subjectTag],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['name', 'description'],
  },
  response: {
    201: subjectResponse,
    500: errorBody,
  },
} as const;

export const updateSubjectSchema = {
  description: 'Update a subject by ID',
  tags: [subjectTag],
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
    200: subjectResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const deleteSubjectSchema = {
  description: 'Delete a subject by ID',
  tags: [subjectTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: subjectResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;
