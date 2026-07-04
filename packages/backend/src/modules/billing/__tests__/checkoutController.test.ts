import { describe, it, expect, beforeEach, mock } from 'bun:test';
import checkoutController from '../controllers/checkoutController';
import db from '../../../shared/db';
import stripe from '../lib/stripeClient';
import type { FastifyReply, FastifyRequest } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    establishment: {
      findUnique: mock(),
      update: mock(),
    },
  },
}));

mock.module('../lib/stripeClient', () => ({
  default: {
    customers: { create: mock() },
    checkout: { sessions: { create: mock() } },
  },
}));

process.env.STRIPE_PRICE_STARTER = 'price_test_starter';

const prismaMock = db as unknown as {
  establishment: { findUnique: ReturnType<typeof mock>; update: ReturnType<typeof mock> };
};
const stripeMock = stripe as unknown as {
  customers: { create: ReturnType<typeof mock> };
  checkout: { sessions: { create: ReturnType<typeof mock> } };
};

function buildRequest(priceId: string) {
  return {
    body: { priceId },
    billingUser: { userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' },
  } as unknown as FastifyRequest<{ Body: { priceId: string } }>;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('checkoutController.createCheckoutSession', () => {
  beforeEach(() => {
    prismaMock.establishment.findUnique.mockReset();
    prismaMock.establishment.update.mockReset();
    stripeMock.customers.create.mockReset();
    stripeMock.checkout.sessions.create.mockReset();
  });

  it('renvoie 400 pour un priceId inconnu', async () => {
    const reply = buildReply();

    await checkoutController.createCheckoutSession(buildRequest('price_unknown'), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("renvoie 404 si l'établissement n'existe pas", async () => {
    prismaMock.establishment.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await checkoutController.createCheckoutSession(buildRequest('price_test_starter'), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it('crée un customer Stripe au premier checkout et le persiste', async () => {
    prismaMock.establishment.findUnique.mockResolvedValue({
      id: 'est-1',
      name: 'Collège Skolr Demo',
      billingEmail: null,
      stripeCustomerId: null,
    });
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_new' });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    const reply = buildReply();

    await checkoutController.createCheckoutSession(buildRequest('price_test_starter'), reply);

    expect(stripeMock.customers.create).toHaveBeenCalledWith({
      email: 'admin@skolr.local',
      name: 'Collège Skolr Demo',
    });
    expect(prismaMock.establishment.update).toHaveBeenCalledWith({
      where: { id: 'est-1' },
      data: { stripeCustomerId: 'cus_new' },
    });
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_new', mode: 'subscription' }),
    );
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ url: 'https://checkout.stripe.com/test' });
  });

  it('réutilise le customer Stripe existant sans en recréer un', async () => {
    prismaMock.establishment.findUnique.mockResolvedValue({
      id: 'est-1',
      name: 'Collège Skolr Demo',
      billingEmail: null,
      stripeCustomerId: 'cus_existing',
    });
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
    const reply = buildReply();

    await checkoutController.createCheckoutSession(buildRequest('price_test_starter'), reply);

    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(prismaMock.establishment.update).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
  });
});
