import type { FastifyInstance } from 'fastify';
import passwordResetController from '../controllers/passwordResetController';
import { forgotPasswordRouteSchema, resetPasswordRouteSchema } from '../schemas/passwordResetOpenApi';

// Limite resserrée sur les flux de réinitialisation (anti-abus : énumération
// d'emails, force brute sur le jeton), surchargeable par env.
const resetRateLimit = {
  rateLimit: { max: Number(process.env.RATE_LIMIT_RESET_MAX ?? 5), timeWindow: '1 minute' },
};

const passwordResetRoutes = async (fastify: FastifyInstance) => {
  fastify.post(
    '/forgot-password',
    { schema: forgotPasswordRouteSchema, config: resetRateLimit },
    passwordResetController.forgotPassword,
  );
  fastify.post(
    '/reset-password',
    { schema: resetPasswordRouteSchema, config: resetRateLimit },
    passwordResetController.resetPassword,
  );
};

export default passwordResetRoutes;
