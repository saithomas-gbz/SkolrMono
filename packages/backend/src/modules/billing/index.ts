import type { FastifyPluginAsync } from 'fastify';
import establishmentRoutes from './routes/establishmentRoutes';
import checkoutRoutes from './routes/checkoutRoutes';
import portalRoutes from './routes/portalRoutes';
import platformRoutes from './routes/platformRoutes';
import webhookRoutes from './routes/webhookRoutes';

/**
 * Module Billing — monté sous le préfixe `/billing`. Établissements, abonnements
 * Stripe, portail client et webhooks Stripe (body brut encapsulé dans webhookRoutes).
 */
const billingModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(establishmentRoutes);
  await fastify.register(checkoutRoutes);
  await fastify.register(portalRoutes);
  await fastify.register(platformRoutes);
  await fastify.register(webhookRoutes);
};

export const billingOpenApiTags = [{ name: 'billing', description: 'Billing API' }];

export default billingModule;
