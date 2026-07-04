import type { FastifyInstance } from 'fastify';
import establishmentController from '../controllers/establishmentController';
import { requireEstablishmentAdmin } from '../lib/authGuard';
import { getEstablishmentSchema, getPlansSchema } from '../schemas/billingOpenApi';

export default async function establishmentRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/establishment',
    { preHandler: requireEstablishmentAdmin, schema: getEstablishmentSchema },
    establishmentController.getEstablishment,
  );
  fastify.get(
    '/plans',
    { preHandler: requireEstablishmentAdmin, schema: getPlansSchema },
    establishmentController.getPlans,
  );
}
