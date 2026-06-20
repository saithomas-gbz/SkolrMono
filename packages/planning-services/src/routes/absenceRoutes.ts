import type { FastifyInstance } from 'fastify';
import {
  getAbsences,
  getAbsenceById,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  type AbsenceFilters,
} from '../controllers/absenceController';
import { absenceSchema, createAbsenceSchema } from '../schemas/absenceOpenApi';
import { requireAuth } from '../lib/authGuard';

export default async function absenceRoutes(app: FastifyInstance) {
  app.get<{ Querystring: AbsenceFilters }>(
    '/absences',
    { schema: { ...absenceSchema.list, tags: ['absence'] }, preHandler: requireAuth },
    getAbsences,
  );
  app.get<{ Params: { id: string } }>(
    '/absences/:id',
    { schema: { ...absenceSchema.get, tags: ['absence'] }, preHandler: requireAuth },
    getAbsenceById,
  );
  app.post('/absences', { schema: { ...createAbsenceSchema, tags: ['absence'] } }, createAbsence);
  app.patch('/absences/:id', { schema: { ...absenceSchema.update, tags: ['absence'] } }, updateAbsence);
  app.delete('/absences/:id', { schema: { ...absenceSchema.delete, tags: ['absence'] } }, deleteAbsence);
}
