import type { FastifyInstance } from 'fastify';
import webhookController from '../controllers/webhookController';
import { handleStripeWebhookSchema } from '../schemas/billingOpenApi';

export default async function webhookRoutes(fastify: FastifyInstance) {
  // Contexte encapsulé : seule cette route reçoit le body brut (Buffer), nécessaire à la
  // vérification de signature Stripe ; les autres routes gardent le parsing JSON par défaut.
  await fastify.register(async (scoped) => {
    scoped.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
      done(null, body);
    });

    scoped.post(
      '/webhooks/stripe',
      { schema: handleStripeWebhookSchema },
      webhookController.handleStripeWebhook,
    );
  });
}
