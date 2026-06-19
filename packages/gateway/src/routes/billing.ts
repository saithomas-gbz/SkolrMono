import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function billingRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  // Webhooks Stripe : body brut requis pour la vérification de signature en aval.
  // Contexte encapsulé pour ne pas changer le parsing JSON des autres routes /billing/*.
  await fastify.register(async (scoped) => {
    scoped.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
      done(null, body);
    });

    scoped.post(
      '/billing/webhooks/stripe',
      { schema: { hide: true, description: 'Proxy brut vers billing-service (signature Stripe).' } },
      async (request, reply) => {
        await fastify.proxyToBillingService(request, reply);
      },
    );
  });

  fastify.all(
    '/billing/*',
    {
      schema: {
        hide: true,
        description: 'Catch-all proxy to billing-service; see merged OpenAPI paths from billing-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToBillingService(request, reply);
    },
  );
}
