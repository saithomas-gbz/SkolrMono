import type { FastifyInstance } from 'fastify';
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
} from '../controllers/sessionController';
import { sessionSchema, createSessionSchema } from '../schemas/sessionOpenApi';
import { requireAuth, requireStaff } from '../lib/authGuard';

export default async function sessionRoutes(app: FastifyInstance) {
  // Lectures : tous les rôles, `getSessions` restreint déjà le périmètre par rôle.
  // Écritures : staff uniquement — elles étaient en `requireAuth`, ce qui laissait
  // un élève créer, déplacer ou supprimer n'importe quelle séance (#233).
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
    { schema: { ...createSessionSchema, tags: ['session'] }, preHandler: requireStaff },
    createSession,
  );
  app.patch(
    '/sessions/:id',
    { schema: { ...sessionSchema.update, tags: ['session'] }, preHandler: requireStaff },
    updateSession,
  );
  app.delete(
    '/sessions/:id',
    { schema: { ...sessionSchema.delete, tags: ['session'] }, preHandler: requireStaff },
    deleteSession,
  );
}
