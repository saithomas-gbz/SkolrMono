import { describe, it, expect, beforeEach, mock } from 'bun:test';
import establishmentController from '../controllers/establishmentController';
import db from '../../../shared/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    establishment: {
      findUnique: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  establishment: { findUnique: ReturnType<typeof mock> };
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

describe('establishmentController.getEstablishment', () => {
  beforeEach(() => {
    prismaMock.establishment.findUnique.mockReset();
  });

  it("renvoie 404 si l'établissement est introuvable", async () => {
    prismaMock.establishment.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await establishmentController.getEstablishment(buildRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it("renvoie l'établissement avec son abonnement", async () => {
    const establishment = {
      id: 'est-1',
      name: 'Collège Skolr Demo',
      slug: 'skolr-demo',
      subscription: { id: 'sub-1', planTier: 'STARTER', status: 'ACTIVE' },
    };
    prismaMock.establishment.findUnique.mockResolvedValue(establishment);
    const reply = buildReply();

    await establishmentController.getEstablishment(buildRequest(), reply);

    expect(prismaMock.establishment.findUnique).toHaveBeenCalledWith({
      where: { id: 'est-1' },
      include: { subscription: true },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ data: establishment });
  });
});

describe('establishmentController.getPlans', () => {
  it('renvoie les 3 plans (Starter/Standard/Premium)', async () => {
    const reply = buildReply();

    await establishmentController.getPlans({} as FastifyRequest, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const [{ data }] = (reply.send as ReturnType<typeof mock>).mock.calls[0] as [{ data: { tier: string }[] }];
    expect(data.map((plan) => plan.tier)).toEqual(['STARTER', 'STANDARD', 'PREMIUM']);
  });
});
