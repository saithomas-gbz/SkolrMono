import type { FastifyInstance } from 'fastify';
import gradeController from '../controllers/gradeController';
import { requireSelfOrStaff, requireStaff } from '../lib/authGuard';
import {
  createGradeSchema,
  deleteGradeSchema,
  getAllGradesSchema,
  getGradeByIdSchema,
  getGradesByClassIdSchema,
  getGradesByUserIdSchema,
  updateGradeSchema,
} from '../schemas/gradeOpenApi';

export default async function gradeRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/grades',
    { schema: getAllGradesSchema, preHandler: requireStaff },
    gradeController.getAllGrades,
  );
  fastify.get(
    '/grades/class/:classId',
    { schema: getGradesByClassIdSchema, preHandler: requireStaff },
    gradeController.getGradesByClassId,
  );
  fastify.get(
    '/grades/user/:userId',
    { schema: getGradesByUserIdSchema, preHandler: requireSelfOrStaff },
    gradeController.getGradesByUserId,
  );
  fastify.get(
    '/grades/:id',
    { schema: getGradeByIdSchema, preHandler: requireStaff },
    gradeController.getGradeById,
  );
  fastify.post(
    '/grades',
    { schema: createGradeSchema, preHandler: requireStaff },
    gradeController.createGrade,
  );
  fastify.patch(
    '/grades/:id',
    { schema: updateGradeSchema, preHandler: requireStaff },
    gradeController.updateGrade,
  );
  fastify.delete(
    '/grades/:id',
    { schema: deleteGradeSchema, preHandler: requireStaff },
    gradeController.deleteGrade,
  );
}
