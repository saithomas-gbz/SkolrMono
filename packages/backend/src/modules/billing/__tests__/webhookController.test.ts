import { describe, it, expect, beforeEach, mock } from 'bun:test';
import webhookController from '../controllers/webhookController';
import db from '../../../shared/db';
import stripe from '../lib/stripeClient';
import { publish } from '../../../shared/events';
import { resolveBillingRecipients } from '../lib/resolveBillingRecipients';
import type { FastifyReply, FastifyRequest } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    establishment: { findUnique: mock() },
    stripeWebhookEvent: { findUnique: mock(), create: mock() },
    subscription: { upsert: mock(), updateMany: mock() },
  },
}));

mock.module('../lib/stripeClient', () => ({
  default: {
    webhooks: { constructEvent: mock() },
    subscriptions: { retrieve: mock() },
  },
}));

mock.module('../lib/resolveBillingRecipients', () => ({
  resolveBillingRecipients: mock(() => Promise.resolve(['admin-1'])),
}));

mock.module('../../../shared/events', () => ({
  publish: mock(() => Promise.resolve()),
}));

const prismaMock = db as unknown as {
  establishment: { findUnique: ReturnType<typeof mock> };
  stripeWebhookEvent: { findUnique: ReturnType<typeof mock>; create: ReturnType<typeof mock> };
  subscription: { upsert: ReturnType<typeof mock>; updateMany: ReturnType<typeof mock> };
};
const stripeMock = stripe as unknown as {
  webhooks: { constructEvent: ReturnType<typeof mock> };
  subscriptions: { retrieve: ReturnType<typeof mock> };
};
const publishMock = publish as unknown as ReturnType<typeof mock>;
const resolveBillingRecipientsMock = resolveBillingRecipients as unknown as ReturnType<typeof mock>;

function buildRequest(headers: Record<string, string> = { 'stripe-signature': 'sig_test' }): FastifyRequest {
  return {
    headers,
    body: Buffer.from('{}'),
    log: { warn: mock(), error: mock() },
  } as unknown as FastifyRequest;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('webhookController.handleStripeWebhook', () => {
  beforeEach(() => {
    prismaMock.establishment.findUnique.mockReset();
    prismaMock.stripeWebhookEvent.findUnique.mockReset();
    prismaMock.stripeWebhookEvent.create.mockReset();
    prismaMock.subscription.upsert.mockReset();
    prismaMock.subscription.updateMany.mockReset();
    stripeMock.webhooks.constructEvent.mockReset();
    stripeMock.subscriptions.retrieve.mockReset();
    publishMock.mockReset();
    publishMock.mockResolvedValue(undefined);
    resolveBillingRecipientsMock.mockReset();
    resolveBillingRecipientsMock.mockResolvedValue(['admin-1']);
  });

  it('renvoie 400 si Stripe-Signature est absent', async () => {
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest({}), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(stripeMock.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it('renvoie 400 si la signature est invalide (et ne touche pas la base)', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(prismaMock.stripeWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('déduplique un événement déjà traité (idempotence)', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', subscription: 'sub_1' } },
    });
    prismaMock.stripeWebhookEvent.findUnique.mockResolvedValue({ id: 'evt_1', type: 'checkout.session.completed' });
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest(), reply);

    expect(prismaMock.stripeWebhookEvent.create).not.toHaveBeenCalled();
    expect(stripeMock.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith({ received: true, deduplicated: true });
  });

  it('checkout.session.completed : synchronise l’abonnement et publie billing.subscription.activated', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', subscription: 'sub_1' } },
    });
    prismaMock.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 'est-1', stripeCustomerId: 'cus_1' });
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      items: {
        data: [
          {
            price: { id: 'price_starter' },
            current_period_start: 1700000000,
            current_period_end: 1702592000,
          },
        ],
      },
      cancel_at_period_end: false,
    });
    prismaMock.subscription.upsert.mockResolvedValue({ status: 'ACTIVE', planTier: 'STARTER' });
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest(), reply);

    expect(prismaMock.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: { id: 'evt_2', type: 'checkout.session.completed' },
    });
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { establishmentId: 'est-1' } }),
    );
    expect(publishMock).toHaveBeenCalledWith('billing.subscription.activated', {
      establishmentId: 'est-1',
      recipientUserIds: ['admin-1'],
      status: 'ACTIVE',
      planTier: 'STARTER',
    });
    expect(reply.send).toHaveBeenCalledWith({ received: true });
  });

  it('customer.subscription.deleted : passe en CANCELED et publie billing.subscription.canceled', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_3',
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1' } },
    });
    prismaMock.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 'est-1', stripeCustomerId: 'cus_1' });
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest(), reply);

    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith({
      where: { establishmentId: 'est-1' },
      data: { status: 'CANCELED' },
    });
    expect(publishMock).toHaveBeenCalledWith('billing.subscription.canceled', {
      establishmentId: 'est-1',
      recipientUserIds: ['admin-1'],
    });
  });

  it('invoice.payment_failed : passe en PAST_DUE et publie billing.payment.failed', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_4',
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_1' } },
    });
    prismaMock.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 'est-1', stripeCustomerId: 'cus_1' });
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest(), reply);

    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith({
      where: { establishmentId: 'est-1' },
      data: { status: 'PAST_DUE' },
    });
    expect(publishMock).toHaveBeenCalledWith('billing.payment.failed', {
      establishmentId: 'est-1',
      recipientUserIds: ['admin-1'],
    });
  });

  it('invoice.paid : repasse en ACTIVE sans publier de notification', async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: 'evt_5',
      type: 'invoice.paid',
      data: { object: { customer: 'cus_1' } },
    });
    prismaMock.stripeWebhookEvent.findUnique.mockResolvedValue(null);
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 'est-1', stripeCustomerId: 'cus_1' });
    const reply = buildReply();

    await webhookController.handleStripeWebhook(buildRequest(), reply);

    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith({
      where: { establishmentId: 'est-1' },
      data: { status: 'ACTIVE' },
    });
    expect(publishMock).not.toHaveBeenCalled();
  });
});
