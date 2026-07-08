import type { FastifyInstance } from 'fastify';
import statsController from '../controllers/statsController';
import { requireStaff, requireSelfOrStaff } from '../lib/authGuard';
import { getClassStatsSchema, getUserStatsSchema, getAssignmentStatsSchema } from '../schemas/statsOpenApi';

export default async function statsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/stats/class/:classId',
    { schema: getClassStatsSchema, preHandler: requireStaff },
    statsController.getClassStats,
  );
  fastify.get(
    '/stats/user/:userId',
    { schema: getUserStatsSchema, preHandler: requireSelfOrStaff },
    statsController.getUserStats,
  );
  fastify.get(
    '/stats/assignment/:assignmentId',
    { schema: getAssignmentStatsSchema, preHandler: requireStaff },
    statsController.getAssignmentStats,
  );
}
