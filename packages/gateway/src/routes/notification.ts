import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function notificationRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  fastify.all(
    '/notification/*',
    {
      schema: {
        hide: true,
        description: 'Catch-all proxy to notification-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToNotificationService(request, reply);
    },
  );
}
