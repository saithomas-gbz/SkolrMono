import type { FastifyInstance } from 'fastify';
import courseController from '../controllers/courseController';
import {
  getAllCoursesSchema,
  getCourseByIdSchema,
  createCourseSchema,
  updateCourseSchema,
  deleteCourseSchema,
  massDeleteCoursesSchema,
} from '../schemas/courseOpenApi';

export default async function courseRoutes(fastify: FastifyInstance) {
  fastify.get('/courses', { schema: getAllCoursesSchema }, courseController.getAllCourses);
  fastify.get('/courses/:id', { schema: getCourseByIdSchema }, courseController.getCourseById);
  fastify.post('/courses', { schema: createCourseSchema }, courseController.createCourse);
  fastify.put('/courses/:id', { schema: updateCourseSchema }, courseController.updateCourse);
  fastify.delete('/courses/:id', { schema: deleteCourseSchema }, courseController.deleteCourse);
  fastify.delete('/courses', { schema: massDeleteCoursesSchema }, courseController.massDeleteCourses);
}
