import type { FastifyInstance } from 'fastify';
import assignmentController from '../controllers/assignmentController';
import { requireAuth, requireStaff } from '../lib/authGuard';
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
  fastify.post(
    '/assignments',
    { schema: createAssignmentSchema, preHandler: requireStaff },
    assignmentController.createAssignment,
  );
  fastify.get(
    '/assignments',
    { schema: getAssignmentsSchema, preHandler: requireAuth },
    assignmentController.getAssignments,
  );
  fastify.get(
    '/assignments/:id',
    { schema: getAssignmentByIdSchema, preHandler: requireAuth },
    assignmentController.getAssignmentById,
  );
  fastify.patch(
    '/assignments/:id',
    { schema: updateAssignmentSchema, preHandler: requireStaff },
    assignmentController.updateAssignment,
  );
  fastify.delete(
    '/assignments/:id',
    { schema: deleteAssignmentSchema, preHandler: requireStaff },
    assignmentController.deleteAssignment,
  );
  fastify.post(
    '/assignments/:id/publish',
    { schema: publishAssignmentSchema, preHandler: requireStaff },
    assignmentController.publishAssignment,
  );
  fastify.get(
    '/assignments/:id/grade-grid',
    { schema: getGradeGridSchema, preHandler: requireStaff },
    assignmentController.getGradeGrid,
  );
  fastify.patch(
    '/assignments/:id/grades/batch',
    { schema: batchUpdateGradesSchema, preHandler: requireStaff },
    assignmentController.batchUpdateGrades,
  );
  fastify.get(
    '/classes/:classId/gradebook',
    { schema: getGradebookSchema, preHandler: requireStaff },
    assignmentController.getGradebook,
  );
}
