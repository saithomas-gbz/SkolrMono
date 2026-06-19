import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import stripe from '../lib/stripeClient';
import { getPlans } from '../lib/plans';

export interface CheckoutBody {
  priceId: string;
}

export default {
  createCheckoutSession: async (
    request: FastifyRequest<{ Body: CheckoutBody }>,
    reply: FastifyReply,
  ) => {
    const { priceId } = request.body;
    const knownPlan = getPlans().some((plan) => plan.priceId === priceId);
    if (!priceId || !knownPlan) {
      return reply.status(400).send({ error: 'Unknown priceId' });
    }

    const establishmentId = request.billingUser!.establishmentId!;
    const establishment = await db.establishment.findUnique({ where: { id: establishmentId } });
    if (!establishment) {
      return reply.status(404).send({ error: 'Establishment not found' });
    }

    let stripeCustomerId = establishment.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: establishment.billingEmail ?? request.billingUser!.email,
        name: establishment.name,
      });
      stripeCustomerId = customer.id;
      await db.establishment.update({
        where: { id: establishment.id },
        data: { stripeCustomerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:3003/admin/billing?success=1',
      cancel_url: process.env.STRIPE_CANCEL_URL ?? 'http://localhost:3003/admin/billing?canceled=1',
    });

    return reply.status(200).send({ url: session.url });
  },
};
