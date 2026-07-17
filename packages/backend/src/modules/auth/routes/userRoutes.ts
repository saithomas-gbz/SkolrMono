import type { FastifyInstance } from 'fastify';
import userController from '../controllers/userController';
import { requireAuth, requireSelfOrAdmin } from '../../../shared/jwt/authGuard';
import {
  meRouteSchema,
  exportMyDataRouteSchema,
  eraseMyAccountRouteSchema,
  getUsersByIdsRouteSchema,
  getUserByIdRouteSchema,
  createUserRouteSchema,
  updateUserRouteSchema,
  deleteUserRouteSchema,
  massDeleteUsersRouteSchema,
  changePasswordRouteSchema,
} from '../schemas/userOpenApi';

const userRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/me', { schema: meRouteSchema }, userController.me);
  // RGPD — export (accès/portabilité) et effacement du compte de l'appelant.
  fastify.get(
    '/me/export',
    { schema: exportMyDataRouteSchema, preHandler: requireAuth },
    userController.exportMyData,
  );
  fastify.delete(
    '/me',
    { schema: eraseMyAccountRouteSchema, preHandler: requireAuth },
    userController.eraseMyAccount,
  );
  fastify.get('/users', { schema: getUsersByIdsRouteSchema }, userController.getUsersByIds);
  fastify.get('/users/:id', { schema: getUserByIdRouteSchema }, userController.getUserById);
  fastify.post('/users', { schema: createUserRouteSchema }, userController.createUser);
  fastify.put(
    '/users/:id',
    { schema: updateUserRouteSchema, preHandler: requireSelfOrAdmin },
    userController.updateUser,
  );
  fastify.patch(
    '/users/me/password',
    { schema: changePasswordRouteSchema, preHandler: requireAuth },
    userController.changePassword,
  );
  fastify.delete('/users/:id', { schema: deleteUserRouteSchema }, userController.deleteUser);
  fastify.delete('/users', { schema: massDeleteUsersRouteSchema }, userController.massDeleteUsers);
};

export default userRoutes;
