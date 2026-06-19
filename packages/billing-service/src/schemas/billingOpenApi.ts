const billingTag = 'billing';

const errorBody = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

const subscriptionEntity = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'string' },
    planTier: { type: 'string' },
    status: { type: 'string' },
    currentPeriodStart: { type: 'string', nullable: true },
    currentPeriodEnd: { type: 'string', nullable: true },
    cancelAtPeriodEnd: { type: 'boolean' },
  },
  required: ['id', 'planTier', 'status', 'cancelAtPeriodEnd'],
} as const;

const establishmentEntity = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    billingEmail: { type: 'string', nullable: true },
    subscription: subscriptionEntity,
  },
  required: ['id', 'name', 'slug'],
} as const;

const planEntity = {
  type: 'object',
  properties: {
    tier: { type: 'string' },
    priceId: { type: 'string', nullable: true },
    studentLimit: { type: 'number', nullable: true },
  },
  required: ['tier', 'priceId', 'studentLimit'],
} as const;

export const getEstablishmentSchema = {
  description: "Récupère l'établissement et l'abonnement de l'ADMIN authentifié",
  tags: [billingTag],
  response: {
    200: { type: 'object', properties: { data: establishmentEntity }, required: ['data'] },
    401: errorBody,
    403: errorBody,
    404: errorBody,
  },
} as const;

export const getPlansSchema = {
  description: 'Liste des plans Stripe disponibles (Starter/Standard/Premium)',
  tags: [billingTag],
  response: {
    200: {
      type: 'object',
      properties: { data: { type: 'array', items: planEntity } },
      required: ['data'],
    },
    401: errorBody,
    403: errorBody,
  },
} as const;

export const createCheckoutSessionSchema = {
  description: "Crée une session Stripe Checkout pour l'établissement de l'ADMIN authentifié",
  tags: [billingTag],
  body: {
    type: 'object',
    properties: { priceId: { type: 'string' } },
    required: ['priceId'],
  },
  response: {
    200: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    400: errorBody,
    401: errorBody,
    403: errorBody,
    404: errorBody,
  },
} as const;

export const createPortalSessionSchema = {
  description:
    "Crée une session Stripe Customer Portal pour l'établissement de l'ADMIN authentifié",
  tags: [billingTag],
  response: {
    200: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
    400: errorBody,
    401: errorBody,
    403: errorBody,
    404: errorBody,
  },
} as const;

export const listEstablishmentsSchema = {
  description: 'Liste tous les établissements (réservé PLATFORM_ADMIN)',
  tags: [billingTag],
  response: {
    200: {
      type: 'object',
      properties: { data: { type: 'array', items: establishmentEntity } },
      required: ['data'],
    },
    401: errorBody,
    403: errorBody,
  },
} as const;
