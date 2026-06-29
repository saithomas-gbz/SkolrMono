import type { FastifyInstance } from 'fastify';
import bulletinController from '../controllers/bulletinController';
import { requireSelfOrStaff } from '../lib/authGuard';
import { getBulletinPdfSchema } from '../schemas/bulletinOpenApi';

export default async function bulletinRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/users/:userId/bulletin',
    { schema: getBulletinPdfSchema, preHandler: requireSelfOrStaff },
    bulletinController.getBulletinPdf,
  );
}
