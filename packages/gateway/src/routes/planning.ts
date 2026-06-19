import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function planningRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  // Dépôt de justificatif (issue #80) : body multipart/form-data transmis tel quel à
  // planning-services, qui le parse avec @fastify/multipart. Contexte encapsulé pour ne
  // pas changer le parsing JSON des autres routes /planning/*.
  await fastify.register(async (scoped) => {
    scoped.addContentTypeParser('multipart/form-data', { parseAs: 'buffer' }, (_request, body, done) => {
      done(null, body);
    });

    scoped.post(
      '/planning/absence-justifications',
      { schema: { hide: true, description: 'Proxy multipart vers planning-services (dépôt de justificatif).' } },
      async (request, reply) => {
        await fastify.proxyToPlanningService(request, reply);
      },
    );
  });

  fastify.all(
    '/planning/*',
    {
      schema: {
        hide: true,
        description: 'Catch-all proxy to planning-services; see merged OpenAPI paths from planning-services.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToPlanningService(request, reply);
    },
  );
}
