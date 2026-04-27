import type { FastifyInstance } from 'fastify';
import classController from '../controllers/classController';
import {
  createClassSchema,
  deleteClassSchema,
  getAllClassesSchema,
  getClassByIdSchema,
  getClassesByTeacherIdSchema,
  updateClassNameOrDescriptionSchema,
  updateClassStudentListSchema,
  updateClassTeacherListSchema,
} from '../schemas/classOpenApi';

export default async function classRoutes(fastify: FastifyInstance) {
  fastify.get('/classes', { schema: getAllClassesSchema }, classController.getAllClasses);
  fastify.get('/classes/:id', { schema: getClassByIdSchema }, classController.getClassById);
  fastify.get(
    '/classes/teacher/:teacherId',
    { schema: getClassesByTeacherIdSchema },
    classController.getClassByTeacherId,
  );

  fastify.post('/classes', { schema: createClassSchema }, classController.createClass);

  fastify.patch(
    '/classes/:id',
    { schema: updateClassNameOrDescriptionSchema },
    classController.updateClassNameOrDescription,
  );

  fastify.put(
    '/classes/:id/teachers',
    { schema: updateClassTeacherListSchema },
    classController.updateClassTeacherList,
  );

  fastify.put(
    '/classes/:id/students',
    { schema: updateClassStudentListSchema },
    classController.updateClassStudentList,
  );

  fastify.delete('/classes/:id', { schema: deleteClassSchema }, classController.deleteClass);
}

