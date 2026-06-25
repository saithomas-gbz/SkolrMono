import type { FastifyInstance } from 'fastify';
import subjectController from '../controllers/subjectController';
import { requireAuth, requireStaff } from '../lib/authGuard';
import {
  getAllSubjectsSchema,
  getSubjectByIdSchema,
  createSubjectSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
} from '../schemas/subjectOpenApi';

export default async function subjectRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/subjects',
    { schema: getAllSubjectsSchema, preHandler: requireAuth },
    subjectController.getAllSubjects,
  );
  fastify.get(
    '/subjects/:id',
    { schema: getSubjectByIdSchema, preHandler: requireAuth },
    subjectController.getSubjectById,
  );
  fastify.post(
    '/subjects',
    { schema: createSubjectSchema, preHandler: requireStaff },
    subjectController.createSubject,
  );
  fastify.put(
    '/subjects/:id',
    { schema: updateSubjectSchema, preHandler: requireStaff },
    subjectController.updateSubject,
  );
  fastify.delete(
    '/subjects/:id',
    { schema: deleteSubjectSchema, preHandler: requireStaff },
    subjectController.deleteSubject,
  );
}
