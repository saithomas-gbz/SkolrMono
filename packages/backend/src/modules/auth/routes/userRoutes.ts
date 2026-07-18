import type { FastifyInstance } from 'fastify';
import userController from '../controllers/userController';
import { requireAuth, requireAdmin, requireSelfOrAdmin } from '../../../shared/jwt/authGuard';
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
  // Lecture réservée aux utilisateurs authentifiés (empêche l'énumération anonyme des comptes).
  fastify.get(
    '/users',
    { schema: getUsersByIdsRouteSchema, preHandler: requireAuth },
    userController.getUsersByIds,
  );
  fastify.get(
    '/users/:id',
    { schema: getUserByIdRouteSchema, preHandler: requireAuth },
    userController.getUserById,
  );
  // Création / suppression de comptes réservées aux ADMIN / PLATFORM_ADMIN.
  fastify.post(
    '/users',
    { schema: createUserRouteSchema, preHandler: requireAdmin },
    userController.createUser,
  );
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
  fastify.delete(
    '/users/:id',
    { schema: deleteUserRouteSchema, preHandler: requireAdmin },
    userController.deleteUser,
  );
  fastify.delete(
    '/users',
    { schema: massDeleteUsersRouteSchema, preHandler: requireAdmin },
    userController.massDeleteUsers,
  );
};

export default userRoutes;
