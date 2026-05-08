import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function authRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  fastify.all(
    '/auth/*',
    {
      schema: {
        hide: true,
        description:
          'Catch-all proxy to auth-service; see merged OpenAPI paths from auth-service.',
      },
    },
    async (request, reply) => {
      request.log.info({
        msg: 'proxy auth',
        incoming: request.url,
        method: request.method,
        hasParsedBody: request.body != null,
      });
      await fastify.proxyToAuthService(request, reply);
    },
  );
}
