import type { FastifyInstance } from 'fastify';
import portalController from '../controllers/portalController';
import { requireEstablishmentAdmin } from '../lib/authGuard';
import { createPortalSessionSchema } from '../schemas/billingOpenApi';

export default async function portalRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/portal-session',
    { preHandler: requireEstablishmentAdmin, schema: createPortalSessionSchema },
    portalController.createPortalSession,
  );
}
