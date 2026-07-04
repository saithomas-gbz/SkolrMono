import type { FastifyRequest, FastifyReply } from 'fastify';
import { getUserId } from './conversationController';
import * as presence from '../utils/presence';

export default {
  getPresence: async (
    request: FastifyRequest<{ Querystring: { userIds?: string | string[] } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const raw = request.query.userIds;
    const userIds = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return reply.status(200).send({ data: presence.getPresence(userIds) });
  },
};
