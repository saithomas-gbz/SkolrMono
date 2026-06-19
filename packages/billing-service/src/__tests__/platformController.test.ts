import { describe, it, expect, beforeEach, mock } from 'bun:test';
import platformController from '../controllers/platformController';
import db from '../db';
import type { FastifyReply, FastifyRequest } from 'fastify';

mock.module('../db', () => ({
  default: {
    establishment: {
      findMany: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  establishment: { findMany: ReturnType<typeof mock> };
};

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('platformController.listEstablishments', () => {
  beforeEach(() => {
    prismaMock.establishment.findMany.mockReset();
  });

  it('liste tous les établissements avec leur abonnement', async () => {
    const establishments = [
      { id: 'est-1', name: 'Collège A', subscription: { status: 'ACTIVE' } },
      { id: 'est-2', name: 'Collège B', subscription: null },
    ];
    prismaMock.establishment.findMany.mockResolvedValue(establishments);
    const reply = buildReply();

    await platformController.listEstablishments({} as FastifyRequest, reply);

    expect(prismaMock.establishment.findMany).toHaveBeenCalledWith({
      include: { subscription: true },
      orderBy: { name: 'asc' },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ data: establishments });
  });
});
