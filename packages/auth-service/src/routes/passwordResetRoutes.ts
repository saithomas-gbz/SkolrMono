import type { FastifyInstance } from 'fastify';
import passwordResetController from '../controllers/passwordResetController';
import { forgotPasswordRouteSchema, resetPasswordRouteSchema } from '../schemas/passwordResetOpenApi';

const passwordResetRoutes = async (fastify: FastifyInstance) => {
  fastify.post(
    '/forgot-password',
    { schema: forgotPasswordRouteSchema },
    passwordResetController.forgotPassword,
  );
  fastify.post(
    '/reset-password',
    { schema: resetPasswordRouteSchema },
    passwordResetController.resetPassword,
  );
};

export default passwordResetRoutes;
