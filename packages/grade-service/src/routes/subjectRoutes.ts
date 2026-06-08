import type { FastifyInstance } from 'fastify';
import subjectController from '../controllers/subjectController';
import {
  getAllSubjectsSchema,
  getSubjectByIdSchema,
  createSubjectSchema,
  updateSubjectSchema,
  deleteSubjectSchema,
} from '../schemas/subjectOpenApi';

export default async function subjectRoutes(fastify: FastifyInstance) {
  fastify.get('/subjects', { schema: getAllSubjectsSchema }, subjectController.getAllSubjects);
  fastify.get('/subjects/:id', { schema: getSubjectByIdSchema }, subjectController.getSubjectById);
  fastify.post('/subjects', { schema: createSubjectSchema }, subjectController.createSubject);
  fastify.put('/subjects/:id', { schema: updateSubjectSchema }, subjectController.updateSubject);
  fastify.delete('/subjects/:id', { schema: deleteSubjectSchema }, subjectController.deleteSubject);
}
