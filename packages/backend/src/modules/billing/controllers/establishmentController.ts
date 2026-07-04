import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import { getPlans } from '../lib/plans';

export default {
  getEstablishment: async (request: FastifyRequest, reply: FastifyReply) => {
    const establishmentId = request.billingUser!.establishmentId!;
    const establishment = await db.establishment.findUnique({
      where: { id: establishmentId },
      include: { subscription: true },
    });
    if (!establishment) {
      return reply.status(404).send({ error: 'Establishment not found' });
    }
    return reply.status(200).send({ data: establishment });
  },

  getPlans: async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({ data: getPlans() });
  },
};
