import type { FastifyInstance } from 'fastify';
import classController from '../controllers/classController';
import { requireAuth, requireStaff } from '../lib/authGuard';
import {
  createClassSchema,
  deleteClassSchema,
  getAllClassesSchema,
  getClassesSummarySchema,
  getClassByIdSchema,
  getClassesByStudentIdSchema,
  getClassesByTeacherIdSchema,
  getTeacherCoursesInClassSchema,
  updateClassNameOrDescriptionSchema,
  updateClassStudentListSchema,
  updateClassTeacherListSchema,
} from '../schemas/classOpenApi';

export default async function classRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/classes',
    { schema: getAllClassesSchema, preHandler: requireStaff },
    classController.getAllClasses,
  );
  fastify.get(
    '/classes/summary',
    { schema: getClassesSummarySchema, preHandler: requireAuth },
    classController.getClassesSummary,
  );
  fastify.get(
    '/classes/teacher/:teacherId',
    { schema: getClassesByTeacherIdSchema, preHandler: requireAuth },
    classController.getClassByTeacherId,
  );
  fastify.get(
    '/classes/student/:studentId',
    { schema: getClassesByStudentIdSchema, preHandler: requireAuth },
    classController.getClassesByStudentId,
  );
  fastify.get(
    '/classes/:classId/teachers/:teacherId/courses',
    { schema: getTeacherCoursesInClassSchema, preHandler: requireAuth },
    classController.getTeacherCoursesInClass,
  );
  fastify.get(
    '/classes/:id',
    { schema: getClassByIdSchema, preHandler: requireAuth },
    classController.getClassById,
  );

  fastify.post('/classes', { schema: createClassSchema, preHandler: requireStaff }, classController.createClass);

  fastify.patch(
    '/classes/:id',
    { schema: updateClassNameOrDescriptionSchema, preHandler: requireStaff },
    classController.updateClassNameOrDescription,
  );

  fastify.put(
    '/classes/:id/teachers',
    { schema: updateClassTeacherListSchema, preHandler: requireStaff },
    classController.updateClassTeacherList,
  );

  fastify.put(
    '/classes/:id/students',
    { schema: updateClassStudentListSchema, preHandler: requireStaff },
    classController.updateClassStudentList,
  );

  fastify.delete(
    '/classes/:id',
    { schema: deleteClassSchema, preHandler: requireStaff },
    classController.deleteClass,
  );
}
