import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import stripe from '../lib/stripeClient';
import { portalReturnUrl } from '../lib/redirectUrls';

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
      // Surtout pas l'URL de succès : elle porte `?success=1`, et le retour de
      // portail annoncerait un paiement même après une annulation (#267).
      return_url: portalReturnUrl(),
    });

    return reply.status(200).send({ url: session.url });
  },
};
