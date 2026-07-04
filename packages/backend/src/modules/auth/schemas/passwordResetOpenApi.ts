export const passwordResetTag = 'password-reset';

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const successMessage = {
  type: 'object',
  properties: { message: { type: 'string' } },
  required: ['message'],
} as const;

export const forgotPasswordRouteSchema = {
  description:
    "Demande de réinitialisation de mot de passe — réponse identique que l'email existe ou non (anti-enumeration)",
  tags: [passwordResetTag],
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
    },
    required: ['email'],
  },
  response: {
    200: successMessage,
    500: errorBody,
  },
} as const;

export const resetPasswordRouteSchema = {
  description: 'Valide le token de réinitialisation et met à jour le mot de passe',
  tags: [passwordResetTag],
  body: {
    type: 'object',
    properties: {
      token: { type: 'string' },
      password: { type: 'string', minLength: 6 },
    },
    required: ['token', 'password'],
  },
  response: {
    200: successMessage,
    400: errorBody,
    500: errorBody,
  },
} as const;
