const courseTag = 'course';

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const courseTopicEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    courseId: { type: 'string' },
  },
  required: ['id', 'name', 'description', 'courseId'],
} as const;

const courseSubjectEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['id', 'name', 'description'],
} as const;

const courseEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    subjectId: { type: 'string', nullable: true },
    subject: { ...courseSubjectEntity, nullable: true },
    relatedCourses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id', 'name', 'description'],
      },
    },
    topics: {
      type: 'array',
      items: courseTopicEntity,
    },
  },
  required: ['id', 'name', 'description'],
} as const;

const courseResponse = {
  type: 'object',
  properties: {
    data: courseEntity,
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

const courseListResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: courseEntity },
    message: { type: 'string' },
  },
  required: ['data', 'message'],
} as const;

export const getAllCoursesSchema = {
  description: 'List all courses',
  tags: [courseTag],
  response: {
    200: courseListResponse,
    500: errorBody,
  },
} as const;

export const getCourseByIdSchema = {
  description: 'Get a course by ID',
  tags: [courseTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: courseResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const createCourseSchema = {
  description: 'Create a new course',
  tags: [courseTag],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      subjectId: { type: 'string' },
    },
    required: ['name', 'description'],
  },
  response: {
    201: courseResponse,
    500: errorBody,
  },
} as const;

export const updateCourseSchema = {
  description: 'Update a course by ID',
  tags: [courseTag],
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
      subjectId: { type: 'string' },
    },
    additionalProperties: false,
  },
  response: {
    200: courseResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const deleteCourseSchema = {
  description: 'Delete a course by ID',
  tags: [courseTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: courseResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const massDeleteCoursesSchema = {
  description: 'Delete multiple courses by their IDs',
  tags: [courseTag],
  body: {
    type: 'object',
    properties: {
      ids: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
    },
    required: ['ids'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        count: { type: 'number' },
      },
      required: ['message', 'count'],
    },
    400: errorBody,
    500: errorBody,
  },
} as const;

export const addRelatedCourseSchema = {
  description: 'Link a course to another course',
  tags: [courseTag],
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
      relatedCourseId: { type: 'string' },
    },
    required: ['relatedCourseId'],
  },
  response: {
    200: courseResponse,
    400: errorBody,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const removeRelatedCourseSchema = {
  description: 'Unlink a course from another course',
  tags: [courseTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      relatedId: { type: 'string' },
    },
    required: ['id', 'relatedId'],
  },
  response: {
    200: courseResponse,
    404: errorBody,
    500: errorBody,
  },
} as const;
