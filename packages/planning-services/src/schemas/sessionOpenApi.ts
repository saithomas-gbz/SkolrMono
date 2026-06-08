const sessionProperties = {
  id: { type: 'string', format: 'uuid' },
  classId: { type: 'string', format: 'uuid' },
  courseId: { type: 'string', format: 'uuid' },
  teacherId: { type: 'string', format: 'uuid' },
  room: { type: 'string', nullable: true },
  startAt: { type: 'string', format: 'date-time' },
  endAt: { type: 'string', format: 'date-time' },
  recurrenceRule: { type: 'string', nullable: true },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

export const sessionSchema = {
  list: {
    description: 'Get sessions — filtrable par classId, teacherId, startAt, endAt',
    querystring: {
      type: 'object',
      properties: {
        classId: { type: 'string', format: 'uuid' },
        teacherId: { type: 'string', format: 'uuid' },
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
      },
    },
    response: {
      200: { type: 'array', items: { type: 'object', properties: sessionProperties } },
    },
  },
  get: {
    description: 'Get a session by ID',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    response: {
      200: { type: 'object', properties: sessionProperties },
      404: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  update: {
    description: 'Update a session',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    body: {
      type: 'object',
      properties: {
        room: { type: 'string' },
        startAt: { type: 'string', format: 'date-time' },
        endAt: { type: 'string', format: 'date-time' },
        recurrenceRule: { type: 'string' },
        teacherId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: { type: 'object', properties: sessionProperties },
      404: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  delete: {
    description: 'Delete a session',
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

export const createSessionSchema = {
  description: 'Create a session',
  body: {
    type: 'object',
    required: ['classId', 'courseId', 'teacherId', 'startAt', 'endAt'],
    properties: {
      classId: { type: 'string', format: 'uuid' },
      courseId: { type: 'string', format: 'uuid' },
      teacherId: { type: 'string', format: 'uuid' },
      room: { type: 'string' },
      startAt: { type: 'string', format: 'date-time' },
      endAt: { type: 'string', format: 'date-time' },
      recurrenceRule: { type: 'string' },
    },
  },
  response: {
    201: { type: 'object', properties: sessionProperties },
  },
};
