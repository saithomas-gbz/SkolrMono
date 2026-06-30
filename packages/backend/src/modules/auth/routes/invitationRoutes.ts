import type { FastifyInstance } from 'fastify';
import invitationController from '../controllers/invitationController';
import { requireEstablishmentAdmin } from '../../../shared/jwt/authGuard';
import {
  acceptInvitationRouteSchema,
  createInvitationRouteSchema,
  getInvitationByTokenRouteSchema,
} from '../schemas/invitationOpenApi';

const invitationRoutes = async (fastify: FastifyInstance) => {
  fastify.post(
    '/invite',
    { schema: createInvitationRouteSchema, preHandler: requireEstablishmentAdmin },
    invitationController.createInvitation,
  );
  fastify.get(
    '/invitations/:token',
    { schema: getInvitationByTokenRouteSchema },
    invitationController.getInvitationByToken,
  );
  fastify.post(
    '/accept-invitation',
    { schema: acceptInvitationRouteSchema },
    invitationController.acceptInvitation,
  );
};

export default invitationRoutes;
