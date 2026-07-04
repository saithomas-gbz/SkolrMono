const documentProperties = {
  id: { type: 'string', format: 'uuid' },
  justificationId: { type: 'string', format: 'uuid' },
  fileName: { type: 'string' },
  mimeType: { type: 'string' },
  sizeBytes: { type: 'number' },
  uploadedAt: { type: 'string', format: 'date-time' },
};

const justificationProperties = {
  id: { type: 'string', format: 'uuid' },
  studentId: { type: 'string', format: 'uuid' },
  status: { type: 'string', enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] },
  reason: { type: 'string' },
  reviewerId: { type: 'string', nullable: true },
  reviewComment: { type: 'string', nullable: true },
  reviewedAt: { type: 'string', format: 'date-time', nullable: true },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
  documents: { type: 'array', items: { type: 'object', properties: documentProperties } },
};

const errorResponse = { type: 'object', properties: { error: { type: 'string' } } };

export const absenceJustificationSchema = {
  list: {
    description: 'Liste des demandes de justification — filtrable par status/studentId/classId',
    querystring: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] },
        studentId: { type: 'string', format: 'uuid' },
        classId: { type: 'string', format: 'uuid' },
      },
    },
    response: {
      200: { type: 'array', items: { type: 'object', properties: justificationProperties } },
      403: errorResponse,
    },
  },
  get: {
    description: 'Détail d\'une demande de justification',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    response: {
      200: { type: 'object', properties: justificationProperties },
      403: errorResponse,
      404: errorResponse,
    },
  },
  create: {
    description: 'Créer une demande de justification (multipart : reason, absenceIds[], fichiers)',
    consumes: ['multipart/form-data'],
    response: {
      201: { type: 'object', properties: justificationProperties },
      400: errorResponse,
      403: errorResponse,
    },
  },
  submit: {
    description: 'Soumettre une demande (DRAFT → PENDING)',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    response: {
      200: { type: 'object', properties: justificationProperties },
      403: errorResponse,
      404: errorResponse,
      409: errorResponse,
    },
  },
  review: {
    description: 'Approuver ou refuser une demande (staff)',
    params: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid' } },
      required: ['id'],
    },
    body: {
      type: 'object',
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['approve', 'reject'] },
        comment: { type: 'string' },
      },
    },
    response: {
      200: { type: 'object', properties: justificationProperties },
      400: errorResponse,
      403: errorResponse,
      404: errorResponse,
      409: errorResponse,
    },
  },
  downloadDocument: {
    description: 'Télécharger un document joint à une demande',
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        docId: { type: 'string', format: 'uuid' },
      },
      required: ['id', 'docId'],
    },
    response: {
      403: errorResponse,
      404: errorResponse,
    },
  },
};
