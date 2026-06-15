import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function messageRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  fastify.all(
    '/message/*',
    {
      schema: {
        hide: true,
        description: 'Catch-all proxy to message-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToMessageService(request, reply);
    },
  );
}
