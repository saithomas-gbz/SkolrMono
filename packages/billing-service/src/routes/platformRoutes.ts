import type { FastifyInstance } from 'fastify';
import platformController from '../controllers/platformController';
import { requirePlatformAdmin } from '../lib/authGuard';
import { listEstablishmentsSchema } from '../schemas/billingOpenApi';

export default async function platformRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/establishments',
    { preHandler: requirePlatformAdmin, schema: listEstablishmentsSchema },
    platformController.listEstablishments,
  );
}
