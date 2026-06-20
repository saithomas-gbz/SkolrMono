import type { FastifyInstance } from 'fastify';
import { getChildren, getChildById } from '../controllers/parentController';
import { parentSchema } from '../schemas/parentOpenApi';

export default async function parentRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { parentId?: string } }>(
    '/parent/children',
    { schema: { ...parentSchema.getChildren, tags: ['parent'] } },
    getChildren,
  );
  app.get<{ Params: { studentId: string } }>(
    '/parent/children/:studentId',
    { schema: { ...parentSchema.getChildById, tags: ['parent'] } },
    getChildById,
  );
}
