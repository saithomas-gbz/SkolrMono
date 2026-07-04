const absenceProperties = {
  id: { type: 'string', format: 'uuid' },
  sessionId: { type: 'string', format: 'uuid' },
  userId: { type: 'string', format: 'uuid' },
  role: { type: 'string', enum: ['STUDENT', 'TEACHER'] },
  justified: { type: 'boolean' },
  reason: { type: 'string', nullable: true },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

export const absenceSchema = {
  list: {
    description: 'Get absences — filtrable par sessionId, userId, role',
    querystring: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        role: { type: 'string', enum: ['STUDENT', 'TEACHER'] },
        justified: { type: 'boolean' },
      },
    },
    response: {
      200: { type: 'array', items: { type: 'object', properties: absenceProperties } },
    },
  },
  get: {
    description: 'Get an absence by ID',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    response: {
      200: { type: 'object', properties: absenceProperties },
      404: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  update: {
    description: 'Justify or update an absence',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        justified: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
    response: {
      200: { type: 'object', properties: absenceProperties },
      404: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  delete: {
    description: 'Delete an absence',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    response: {
      204: { type: 'null' },
      404: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
};

export const createAbsenceSchema = {
  description: 'Record an absence for a session',
  body: {
    type: 'object',
    required: ['sessionId', 'userId', 'role'],
    properties: {
      sessionId: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      role: { type: 'string', enum: ['STUDENT', 'TEACHER'] },
      justified: { type: 'boolean' },
      reason: { type: 'string' },
    },
  },
  response: {
    201: { type: 'object', properties: absenceProperties },
    409: { type: 'object', properties: { error: { type: 'string' } } },
  },
};
