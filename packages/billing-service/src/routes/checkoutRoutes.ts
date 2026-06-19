import type { FastifyInstance } from 'fastify';
import checkoutController from '../controllers/checkoutController';
import { requireEstablishmentAdmin } from '../lib/authGuard';
import { createCheckoutSessionSchema } from '../schemas/billingOpenApi';

export default async function checkoutRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/checkout-session',
    { preHandler: requireEstablishmentAdmin, schema: createCheckoutSessionSchema },
    checkoutController.createCheckoutSession,
  );
}
