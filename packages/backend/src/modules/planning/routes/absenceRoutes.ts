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
import { requireAuth, requireStaff } from '../lib/authGuard';

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
  // Marquer, justifier ou effacer une absence est un geste de vie scolaire : réservé
  // au staff. Ces trois routes n'avaient aucun `preHandler` (#233) — l'application
  // ne pose aucun hook d'authentification global, elles étaient donc ouvertes sans jeton.
  app.post(
    '/absences',
    { schema: { ...createAbsenceSchema, tags: ['absence'] }, preHandler: requireStaff },
    createAbsence,
  );
  app.patch(
    '/absences/:id',
    { schema: { ...absenceSchema.update, tags: ['absence'] }, preHandler: requireStaff },
    updateAbsence,
  );
  app.delete(
    '/absences/:id',
    { schema: { ...absenceSchema.delete, tags: ['absence'] }, preHandler: requireStaff },
    deleteAbsence,
  );
}
