import { FastifyInstance } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export default async function gradeRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  fastify.all(
    '/grade/*',
    {
      schema: {
        hide: true,
        description:
          'Catch-all proxy to grade-service; see merged OpenAPI paths from grade-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToGradeService(request, reply);
    },
  );
}
