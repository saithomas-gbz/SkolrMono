import type { FastifyRequest, FastifyReply } from 'fastify';
import * as presence from '../utils/presence';

export default {
  getPresence: async (
    request: FastifyRequest<{ Querystring: { userIds?: string | string[] } }>,
    reply: FastifyReply,
  ) => {
    // `requireAuth` (préhandler) garantit l'authentification ; l'identité de
    // l'appelant n'est pas utilisée ici (présence interrogée pour des tiers).
    const raw = request.query.userIds;
    const userIds = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return reply.status(200).send({ data: presence.getPresence(userIds) });
  },
};
