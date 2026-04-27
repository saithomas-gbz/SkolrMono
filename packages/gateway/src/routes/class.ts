import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function classRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  fastify.all(
    '/class/*',
    {
      schema: {
        hide: true,
        description:
          'Catch-all proxy to class-service; see merged OpenAPI paths from class-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToClassService(request, reply);
    },
  );
}

