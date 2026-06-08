import type { FastifyInstance } from 'fastify';
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
} from '../controllers/sessionController';
import { sessionSchema, createSessionSchema } from '../schemas/sessionOpenApi';

export default async function sessionRoutes(app: FastifyInstance) {
  app.get('/sessions', { schema: { ...sessionSchema.list, tags: ['session'] } }, getSessions);
  app.get('/sessions/:id', { schema: { ...sessionSchema.get, tags: ['session'] } }, getSessionById);
  app.post('/sessions', { schema: { ...createSessionSchema, tags: ['session'] } }, createSession);
  app.patch('/sessions/:id', { schema: { ...sessionSchema.update, tags: ['session'] } }, updateSession);
  app.delete('/sessions/:id', { schema: { ...sessionSchema.delete, tags: ['session'] } }, deleteSession);
}
