import type { FastifyInstance } from 'fastify';
import {
  getAbsences,
  getAbsenceById,
  createAbsence,
  updateAbsence,
  deleteAbsence,
} from '../controllers/absenceController';
import { absenceSchema, createAbsenceSchema } from '../schemas/absenceOpenApi';

export default async function absenceRoutes(app: FastifyInstance) {
  app.get('/absences', { schema: { ...absenceSchema.list, tags: ['absence'] } }, getAbsences);
  app.get('/absences/:id', { schema: { ...absenceSchema.get, tags: ['absence'] } }, getAbsenceById);
  app.post('/absences', { schema: { ...createAbsenceSchema, tags: ['absence'] } }, createAbsence);
  app.patch('/absences/:id', { schema: { ...absenceSchema.update, tags: ['absence'] } }, updateAbsence);
  app.delete('/absences/:id', { schema: { ...absenceSchema.delete, tags: ['absence'] } }, deleteAbsence);
}
