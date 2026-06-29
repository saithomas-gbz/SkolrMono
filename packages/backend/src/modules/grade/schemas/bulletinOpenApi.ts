const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

export const getBulletinPdfSchema = {
  description: 'Download the grade bulletin (PDF) for a given student',
  tags: ['bulletin'],
  params: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
    required: ['userId'],
  },
  response: {
    200: {
      description: 'PDF file',
      content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } },
    },
    401: errorBody,
    403: errorBody,
    404: errorBody,
    500: errorBody,
  },
} as const;
