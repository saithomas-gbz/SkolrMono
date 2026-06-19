import { describe, it, expect, beforeEach, mock } from 'bun:test';
import portalController from '../controllers/portalController';
import db from '../db';
import stripe from '../lib/stripeClient';
import type { FastifyReply, FastifyRequest } from 'fastify';

mock.module('../db', () => ({
  default: {
    establishment: {
      findUnique: mock(),
    },
  },
}));

mock.module('../lib/stripeClient', () => ({
  default: {
    billingPortal: { sessions: { create: mock() } },
  },
}));

const prismaMock = db as unknown as {
  establishment: { findUnique: ReturnType<typeof mock> };
};
const stripeMock = stripe as unknown as {
  billingPortal: { sessions: { create: ReturnType<typeof mock> } };
};

function buildRequest(): FastifyRequest {
  return {
    billingUser: { userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' },
  } as unknown as FastifyRequest;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('portalController.createPortalSession', () => {
  beforeEach(() => {
    prismaMock.establishment.findUnique.mockReset();
    stripeMock.billingPortal.sessions.create.mockReset();
  });

  it("renvoie 404 si l'établissement est introuvable", async () => {
    prismaMock.establishment.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await portalController.createPortalSession(buildRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it("renvoie 400 si l'établissement n'a pas encore de customer Stripe", async () => {
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 'est-1', stripeCustomerId: null });
    const reply = buildReply();

    await portalController.createPortalSession(buildRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('crée une session Customer Portal pour le customer existant', async () => {
    prismaMock.establishment.findUnique.mockResolvedValue({ id: 'est-1', stripeCustomerId: 'cus_existing' });
    stripeMock.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });
    const reply = buildReply();

    await portalController.createPortalSession(buildRequest(), reply);

    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    );
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ url: 'https://billing.stripe.com/session/test' });
  });
});
