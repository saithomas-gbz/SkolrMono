export const userTag = 'user';

const userPublic = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
    image: { type: 'string', nullable: true },
    role: { type: 'string', enum: ['USER', 'TEACHER', 'STAFF', 'ADMIN'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'email', 'role'],
} as const;

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

export const meRouteSchema = {
  description: 'Get the currently authenticated user',
  tags: [userTag],
  response: {
    200: userPublic,
    401: errorBody,
  },
} as const;

export const getUserByIdRouteSchema = {
  description: 'Get a user by ID',
  tags: [userTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: userPublic,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const createUserRouteSchema = {
  description: 'Create a new user',
  tags: [userTag],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string' },
      role: { type: 'string', enum: ['USER', 'TEACHER', 'STAFF', 'ADMIN'] },
    },
    required: ['email', 'password'],
  },
  response: {
    201: userPublic,
    400: errorBody,
    500: errorBody,
  },
} as const;

export const updateUserRouteSchema = {
  description: 'Update a user by ID',
  tags: [userTag],
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
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['USER', 'TEACHER', 'STAFF', 'ADMIN'] },
    },
  },
  response: {
    200: userPublic,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const deleteUserRouteSchema = {
  description: 'Delete a user by ID',
  tags: [userTag],
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
    404: errorBody,
    500: errorBody,
  },
} as const;

export const massDeleteUsersRouteSchema = {
  description: 'Delete multiple users by their IDs',
  tags: [userTag],
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
