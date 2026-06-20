const errorResponse = { type: 'object', properties: { error: { type: 'string' } } };

const studentRefProperties = {
  id: { type: 'string', format: 'uuid' },
  name: { type: 'string', nullable: true },
  email: { type: 'string' },
};

const childProperties = {
  id: { type: 'string', format: 'uuid' },
  studentId: { type: 'string', format: 'uuid' },
  linkType: { type: 'string', enum: ['LEGAL_GUARDIAN', 'EMERGENCY_CONTACT', 'OTHER'] },
  isPrimary: { type: 'boolean' },
  student: { type: 'object', properties: studentRefProperties, nullable: true },
};

const linkProperties = {
  id: { type: 'string', format: 'uuid' },
  parentId: { type: 'string', format: 'uuid' },
  studentId: { type: 'string', format: 'uuid' },
  linkType: { type: 'string', enum: ['LEGAL_GUARDIAN', 'EMERGENCY_CONTACT', 'OTHER'] },
  isPrimary: { type: 'boolean' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
};

export const parentSchema = {
  getChildren: {
    description: "Enfants rattachés au parent connecté (ou ?parentId= pour un appel inter-services)",
    querystring: {
      type: 'object',
      properties: { parentId: { type: 'string', format: 'uuid' } },
    },
    response: {
      200: { type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: childProperties } } } },
      401: errorResponse,
      403: errorResponse,
    },
  },
  getChildById: {
    description: 'Détail d\'un enfant (vérifie le lien parent ↔ enfant)',
    params: {
      type: 'object',
      properties: { studentId: { type: 'string', format: 'uuid' } },
      required: ['studentId'],
    },
    response: {
      200: { type: 'object', properties: { data: { type: 'object', properties: studentRefProperties } } },
      401: errorResponse,
      403: errorResponse,
      404: errorResponse,
    },
  },
  getParentIds: {
    description: "Parents rattachés à un enfant (appel inter-services, non protégé)",
    querystring: {
      type: 'object',
      properties: { studentId: { type: 'string', format: 'uuid' } },
      required: ['studentId'],
    },
    response: {
      200: { type: 'object', properties: { data: { type: 'array', items: { type: 'string', format: 'uuid' } } } },
      400: errorResponse,
    },
  },
};

export const parentLinkSchema = {
  list: {
    description: 'Liste paginée des liens parent ↔ enfant (filtres parentId/studentId)',
    querystring: {
      type: 'object',
      properties: {
        parentId: { type: 'string', format: 'uuid' },
        studentId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: { type: 'object', properties: { data: { type: 'array', items: { type: 'object', properties: linkProperties } } } },
      401: errorResponse,
      403: errorResponse,
    },
  },
  create: {
    description: 'Créer un lien parent ↔ enfant',
    body: {
      type: 'object',
      required: ['parentId', 'studentId'],
      properties: {
        parentId: { type: 'string', format: 'uuid' },
        studentId: { type: 'string', format: 'uuid' },
        linkType: { type: 'string', enum: ['LEGAL_GUARDIAN', 'EMERGENCY_CONTACT', 'OTHER'] },
        isPrimary: { type: 'boolean' },
      },
    },
    response: {
      201: { type: 'object', properties: linkProperties },
      401: errorResponse,
      403: errorResponse,
      409: errorResponse,
    },
  },
  delete: {
    description: 'Supprimer un lien parent ↔ enfant',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    response: {
      204: { type: 'null' },
      401: errorResponse,
      403: errorResponse,
      404: errorResponse,
    },
  },
};
