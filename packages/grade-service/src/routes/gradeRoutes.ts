import type { FastifyInstance } from 'fastify';
import gradeController from '../controllers/gradeController';
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
  fastify.get('/grades', { schema: getAllGradesSchema }, gradeController.getAllGrades);
  fastify.get(
    '/grades/class/:classId',
    { schema: getGradesByClassIdSchema },
    gradeController.getGradesByClassId,
  );
  fastify.get(
    '/grades/user/:userId',
    { schema: getGradesByUserIdSchema },
    gradeController.getGradesByUserId,
  );
  fastify.get('/grades/:id', { schema: getGradeByIdSchema }, gradeController.getGradeById);
  fastify.post('/grades', { schema: createGradeSchema }, gradeController.createGrade);
  fastify.patch('/grades/:id', { schema: updateGradeSchema }, gradeController.updateGrade);
  fastify.delete('/grades/:id', { schema: deleteGradeSchema }, gradeController.deleteGrade);
}
