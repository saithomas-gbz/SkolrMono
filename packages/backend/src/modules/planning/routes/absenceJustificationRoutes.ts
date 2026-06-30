import type { FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import {
  listAbsenceJustifications,
  getAbsenceJustificationById,
  createAbsenceJustification,
  submitAbsenceJustification,
  reviewAbsenceJustification,
  downloadJustificationDocument,
  type ListFilters,
} from '../controllers/absenceJustificationController';
import { absenceJustificationSchema } from '../schemas/absenceJustificationOpenApi';
import { requireAuth, requireStaff } from '../lib/authGuard';

export default async function absenceJustificationRoutes(app: FastifyInstance) {
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  });

  app.get<{ Querystring: ListFilters }>(
    '/absence-justifications',
    { schema: { ...absenceJustificationSchema.list, tags: ['absence-justification'] }, preHandler: requireAuth },
    listAbsenceJustifications,
  );
  app.get<{ Params: { id: string } }>(
    '/absence-justifications/:id',
    { schema: { ...absenceJustificationSchema.get, tags: ['absence-justification'] }, preHandler: requireAuth },
    getAbsenceJustificationById,
  );
  app.post(
    '/absence-justifications',
    { schema: { ...absenceJustificationSchema.create, tags: ['absence-justification'] }, preHandler: requireAuth },
    createAbsenceJustification,
  );
  app.patch<{ Params: { id: string } }>(
    '/absence-justifications/:id/submit',
    { schema: { ...absenceJustificationSchema.submit, tags: ['absence-justification'] }, preHandler: requireAuth },
    submitAbsenceJustification,
  );
  app.patch<{ Params: { id: string }; Body: { action: 'approve' | 'reject'; comment?: string } }>(
    '/absence-justifications/:id/review',
    { schema: { ...absenceJustificationSchema.review, tags: ['absence-justification'] }, preHandler: requireStaff },
    reviewAbsenceJustification,
  );
  app.get<{ Params: { id: string; docId: string } }>(
    '/absence-justifications/:id/documents/:docId',
    {
      schema: { ...absenceJustificationSchema.downloadDocument, tags: ['absence-justification'] },
      preHandler: requireAuth,
    },
    downloadJustificationDocument,
  );
}
