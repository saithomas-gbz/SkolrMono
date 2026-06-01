import type { FastifyInstance } from 'fastify';
import userController from '../controllers/userController';
import {
  meRouteSchema,
  getUserByIdRouteSchema,
  createUserRouteSchema,
  updateUserRouteSchema,
  deleteUserRouteSchema,
  massDeleteUsersRouteSchema,
} from '../schemas/userOpenApi';

const userRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/me', { schema: meRouteSchema }, userController.me);
  fastify.get('/users/:id', { schema: getUserByIdRouteSchema }, userController.getUserById);
  fastify.post('/users', { schema: createUserRouteSchema }, userController.createUser);
  fastify.put('/users/:id', { schema: updateUserRouteSchema }, userController.updateUser);
  fastify.delete('/users/:id', { schema: deleteUserRouteSchema }, userController.deleteUser);
  fastify.delete('/users', { schema: massDeleteUsersRouteSchema }, userController.massDeleteUsers);
};

export default userRoutes;
