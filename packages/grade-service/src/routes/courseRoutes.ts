import type { FastifyInstance } from 'fastify';
import courseController from '../controllers/courseController';
import { requireAuth, requireStaff } from '../lib/authGuard';
import {
  getAllCoursesSchema,
  getCourseByIdSchema,
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  massDeleteCoursesSchema,
  addRelatedCourseSchema,
  removeRelatedCourseSchema,
} from '../schemas/courseOpenApi';

export default async function courseRoutes(fastify: FastifyInstance) {
  fastify.get('/courses', { schema: getAllCoursesSchema, preHandler: requireAuth }, courseController.getAllCourses);
  fastify.get(
    '/courses/:id',
    { schema: getCourseByIdSchema, preHandler: requireAuth },
    courseController.getCourseById,
  );
  fastify.post('/courses', { schema: createCourseSchema, preHandler: requireStaff }, courseController.createCourse);
  fastify.put('/courses/:id', { schema: updateCourseSchema, preHandler: requireStaff }, courseController.updateCourse);
  fastify.delete(
    '/courses/:id',
    { schema: deleteCourseSchema, preHandler: requireStaff },
    courseController.deleteCourse,
  );
  fastify.delete(
    '/courses',
    { schema: massDeleteCoursesSchema, preHandler: requireStaff },
    courseController.massDeleteCourses,
  );
  fastify.post(
    '/courses/:id/related',
    { schema: addRelatedCourseSchema, preHandler: requireStaff },
    courseController.addRelatedCourse,
  );
  fastify.delete(
    '/courses/:id/related/:relatedId',
    { schema: removeRelatedCourseSchema, preHandler: requireStaff },
    courseController.removeRelatedCourse,
  );
}
