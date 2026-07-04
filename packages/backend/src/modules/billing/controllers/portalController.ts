import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import stripe from '../lib/stripeClient';

export default {
  createPortalSession: async (request: FastifyRequest, reply: FastifyReply) => {
    const establishmentId = request.billingUser!.establishmentId!;
    const establishment = await db.establishment.findUnique({ where: { id: establishmentId } });
    if (!establishment) {
      return reply.status(404).send({ error: 'Establishment not found' });
    }
    if (!establishment.stripeCustomerId) {
      return reply.status(400).send({ error: 'No Stripe customer yet — subscribe first' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: establishment.stripeCustomerId,
      return_url: process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:3003/admin/billing',
    });

    return reply.status(200).send({ url: session.url });
  },
};
