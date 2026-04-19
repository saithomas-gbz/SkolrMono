export const authTag = 'auth';

const userPublic = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['USER', 'ADMIN'] },
  },
  required: ['id', 'email', 'role'],
} as const;

const authSuccess = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    user: userPublic,
  },
  required: ['token', 'user'],
} as const;

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

export const loginRouteSchema = {
  description: 'Authenticate user and return JWT token',
  tags: [authTag],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
    required: ['email', 'password'],
  },
  response: {
    200: authSuccess,
    401: errorBody,
    500: errorBody,
  },
} as const;

export const registerRouteSchema = {
  description: 'Register a new user',
  tags: [authTag],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string' },
    },
    required: ['email', 'password'],
  },
  response: {
    201: authSuccess,
    400: errorBody,
    500: errorBody,
  },
} as const;

export const googleCallbackRouteSchema = {
  description: 'Google OAuth callback (authorization code exchange and JWT redirect)',
  tags: [authTag],
  response: {
    302: {
      description: 'Redirect to frontend with JWT in query string',
    },
    500: {
      description: 'Error during OAuth flow',
    },
  },
} as const;
