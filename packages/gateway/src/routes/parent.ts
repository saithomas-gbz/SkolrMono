import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function parentRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  fastify.all(
    '/parent/*',
    {
      schema: {
        hide: true,
        description: 'Catch-all proxy to parent-service; see merged OpenAPI paths from parent-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToParentService(request, reply);
    },
  );
}
