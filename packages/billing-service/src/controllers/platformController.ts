import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

export default {
  listEstablishments: async (_request: FastifyRequest, reply: FastifyReply) => {
    const establishments = await db.establishment.findMany({
      include: { subscription: true },
      orderBy: { name: 'asc' },
    });
    return reply.status(200).send({ data: establishments });
  },
};
