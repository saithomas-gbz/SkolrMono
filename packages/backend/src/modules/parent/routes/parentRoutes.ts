import type { FastifyInstance } from 'fastify';
import { getChildren, getChildById, getParentIds } from '../controllers/parentController';
import { parentSchema } from '../schemas/parentOpenApi';

export default async function parentRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { parentId?: string } }>(
    '/children',
    { schema: { ...parentSchema.getChildren, tags: ['parent'] } },
    getChildren,
  );
  app.get<{ Params: { studentId: string } }>(
    '/children/:studentId',
    { schema: { ...parentSchema.getChildById, tags: ['parent'] } },
    getChildById,
  );
  app.get<{ Querystring: { studentId?: string } }>(
    '/parents',
    { schema: { ...parentSchema.getParentIds, tags: ['parent'] } },
    getParentIds,
  );
}
