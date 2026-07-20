export const invitationTag = 'invitation';

const invitableRoles = ['USER', 'TEACHER', 'STAFF', 'PARENT'];

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const invitationPreview = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: invitableRoles },
  },
  required: ['email', 'role'],
} as const;

const userPublic = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
    role: { type: 'string', enum: invitableRoles },
    establishmentId: { type: 'string', nullable: true },
  },
  required: ['id', 'email', 'role'],
} as const;

export const createInvitationRouteSchema = {
  description: "Invite a new user by email (réservé à l'ADMIN de l'établissement)",
  tags: [invitationTag],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: invitableRoles },
    },
    required: ['email', 'role'],
  },
  response: {
    201: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message'],
    },
    400: errorBody,
    401: errorBody,
    403: errorBody,
    500: errorBody,
  },
} as const;

export const getInvitationByTokenRouteSchema = {
  description: "Valide un token d'invitation et renvoie l'email/rôle pour préremplir l'inscription",
  tags: [invitationTag],
  params: {
    type: 'object',
    properties: {
      token: { type: 'string' },
    },
    required: ['token'],
  },
  response: {
    200: invitationPreview,
    404: errorBody,
    500: errorBody,
  },
} as const;

export const acceptInvitationRouteSchema = {
  description: "Accepte une invitation et crée le compte utilisateur",
  tags: [invitationTag],
  body: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      password: { type: 'string', minLength: 6 },
      name: { type: 'string' },
    },
    required: ['token', 'password'],
  },
  response: {
    201: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refreshToken: { type: 'string' },
        user: userPublic,
      },
      required: ['token', 'refreshToken', 'user'],
    },
    400: errorBody,
    500: errorBody,
  },
} as const;
