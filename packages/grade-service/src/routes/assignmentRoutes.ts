import type { FastifyInstance } from 'fastify';
import assignmentController from '../controllers/assignmentController';
import {
  batchUpdateGradesSchema,
  createAssignmentSchema,
  deleteAssignmentSchema,
  getAssignmentByIdSchema,
  getAssignmentsSchema,
  getGradebookSchema,
  getGradeGridSchema,
  publishAssignmentSchema,
  updateAssignmentSchema,
} from '../schemas/assignmentOpenApi';

export default async function assignmentRoutes(fastify: FastifyInstance) {
  fastify.post('/assignments', { schema: createAssignmentSchema }, assignmentController.createAssignment);
  fastify.get('/assignments', { schema: getAssignmentsSchema }, assignmentController.getAssignments);
  fastify.get('/assignments/:id', { schema: getAssignmentByIdSchema }, assignmentController.getAssignmentById);
  fastify.patch('/assignments/:id', { schema: updateAssignmentSchema }, assignmentController.updateAssignment);
  fastify.delete('/assignments/:id', { schema: deleteAssignmentSchema }, assignmentController.deleteAssignment);
  fastify.post('/assignments/:id/publish', { schema: publishAssignmentSchema }, assignmentController.publishAssignment);
  fastify.get('/assignments/:id/grade-grid', { schema: getGradeGridSchema }, assignmentController.getGradeGrid);
  fastify.patch('/assignments/:id/grades/batch', { schema: batchUpdateGradesSchema }, assignmentController.batchUpdateGrades);
  fastify.get('/classes/:classId/gradebook', { schema: getGradebookSchema }, assignmentController.getGradebook);
}
