import type { FastifyRequest, FastifyReply } from 'fastify';
import type Stripe from 'stripe';
import { publish } from '@skolr/rabbitmq';
import db from '../db';
import stripe from '../lib/stripeClient';
import { getPlans } from '../lib/plans';
import { mapStripeStatus, mapPriceIdToTier } from '../lib/stripeStatusMapping';
import { resolveBillingRecipients } from '../lib/resolveBillingRecipients';

async function findEstablishmentByCustomerId(customerId: string) {
  return db.establishment.findUnique({ where: { stripeCustomerId: customerId } });
}

async function upsertSubscriptionFromStripe(establishmentId: string, sub: Stripe.Subscription) {
  // Depuis l'API Stripe 2024-04+, les dates de période vivent sur l'item, plus sur la subscription.
  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const data = {
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId ?? null,
    planTier: mapPriceIdToTier(priceId, getPlans()),
    status: mapStripeStatus(sub.status),
    currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };

  return db.subscription.upsert({
    where: { establishmentId },
    create: { establishmentId, ...data },
    update: data,
  });
}

async function publishBillingEvent(
  routingKey: string,
  establishmentId: string,
  extra: Record<string, unknown>,
  log: FastifyRequest['log'],
) {
  const recipientUserIds = await resolveBillingRecipients(establishmentId);
  await publish(routingKey, { establishmentId, recipientUserIds, ...extra }).catch((err) =>
    log.warn({ err, routingKey }, '[billing-service] Failed to publish billing event'),
  );
}

export default {
  handleStripeWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      return reply.status(400).send({ error: 'Missing Stripe-Signature header' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? '',
      );
    } catch (err) {
      request.log.warn({ err }, '[billing-service] Invalid Stripe webhook signature');
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    const alreadyProcessed = await db.stripeWebhookEvent.findUnique({ where: { id: event.id } });
    if (alreadyProcessed) {
      return reply.status(200).send({ received: true, deduplicated: true });
    }
    await db.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const establishment = await findEstablishmentByCustomerId(session.customer as string);
        if (establishment && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const subscription = await upsertSubscriptionFromStripe(establishment.id, sub);
          await publishBillingEvent(
            'billing.subscription.activated',
            establishment.id,
            { status: subscription.status, planTier: subscription.planTier },
            request.log,
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const establishment = await findEstablishmentByCustomerId(sub.customer as string);
        if (establishment) {
          await upsertSubscriptionFromStripe(establishment.id, sub);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const establishment = await findEstablishmentByCustomerId(sub.customer as string);
        if (establishment) {
          await db.subscription.updateMany({
            where: { establishmentId: establishment.id },
            data: { status: 'CANCELED' },
          });
          await publishBillingEvent(
            'billing.subscription.canceled',
            establishment.id,
            {},
            request.log,
          );
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const establishment = await findEstablishmentByCustomerId(invoice.customer as string);
        if (establishment) {
          await db.subscription.updateMany({
            where: { establishmentId: establishment.id },
            data: { status: 'ACTIVE' },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const establishment = await findEstablishmentByCustomerId(invoice.customer as string);
        if (establishment) {
          await db.subscription.updateMany({
            where: { establishmentId: establishment.id },
            data: { status: 'PAST_DUE' },
          });
          await publishBillingEvent('billing.payment.failed', establishment.id, {}, request.log);
        }
        break;
      }

      default:
        break;
    }

    return reply.status(200).send({ received: true });
  },
};
