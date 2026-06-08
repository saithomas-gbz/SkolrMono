const topicTag = 'topic';

const errorBody = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
} as const;

export const topicEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    courseId: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  required: ['id', 'name', 'description', 'courseId'],
} as const;

const topicResponse = {
  type: 'object',
  properties: { data: topicEntity, message: { type: 'string' } },
  required: ['data', 'message'],
} as const;

const topicListResponse = {
  type: 'object',
  properties: { data: { type: 'array', items: topicEntity }, message: { type: 'string' } },
  required: ['data', 'message'],
} as const;

export const getAllTopicsSchema = {
  description: 'List all topics, optionally filtered by courseId',
  tags: [topicTag],
  querystring: {
    type: 'object',
    properties: { courseId: { type: 'string' } },
  },
  response: { 200: topicListResponse, 500: errorBody },
} as const;

export const getTopicByIdSchema = {
  description: 'Get a topic by ID',
  tags: [topicTag],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  response: { 200: topicResponse, 404: errorBody, 500: errorBody },
} as const;

export const createTopicSchema = {
  description: 'Create a new topic for a course',
  tags: [topicTag],
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      courseId: { type: 'string' },
    },
    required: ['name', 'description', 'courseId'],
  },
  response: { 201: topicResponse, 404: errorBody, 500: errorBody },
} as const;

export const updateTopicSchema = {
  description: 'Update a topic by ID',
  tags: [topicTag],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
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
  response: { 200: topicResponse, 404: errorBody, 500: errorBody },
} as const;

export const deleteTopicSchema = {
  description: 'Delete a topic by ID',
  tags: [topicTag],
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  response: { 200: topicResponse, 404: errorBody, 500: errorBody },
} as const;
