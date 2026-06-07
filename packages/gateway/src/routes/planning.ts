import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function planningRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

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
