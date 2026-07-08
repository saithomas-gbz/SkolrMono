import type { FastifyInstance } from 'fastify';
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
} from '../controllers/sessionController';
import { sessionSchema, createSessionSchema } from '../schemas/sessionOpenApi';
import { requireAuth } from '../lib/authGuard';

export default async function sessionRoutes(app: FastifyInstance) {
  app.get(
    '/sessions',
    { schema: { ...sessionSchema.list, tags: ['session'] }, preHandler: requireAuth },
    getSessions,
  );
  app.get(
    '/sessions/:id',
    { schema: { ...sessionSchema.get, tags: ['session'] }, preHandler: requireAuth },
    getSessionById,
  );
  app.post(
    '/sessions',
    { schema: { ...createSessionSchema, tags: ['session'] }, preHandler: requireAuth },
    createSession,
  );
  app.patch(
    '/sessions/:id',
    { schema: { ...sessionSchema.update, tags: ['session'] }, preHandler: requireAuth },
    updateSession,
  );
  app.delete(
    '/sessions/:id',
    { schema: { ...sessionSchema.delete, tags: ['session'] }, preHandler: requireAuth },
    deleteSession,
  );
}
