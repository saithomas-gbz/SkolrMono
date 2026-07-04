import { describe, it, expect, mock } from 'bun:test';
import { requireEstablishmentAdmin, requirePlatformAdmin } from '../lib/authGuard';
import type { FastifyReply, FastifyRequest } from 'fastify';

function buildRequest(verify: ReturnType<typeof mock>): FastifyRequest {
  return {
    headers: { authorization: 'Bearer token' },
    server: { jwt: { verify } },
  } as unknown as FastifyRequest;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('requireEstablishmentAdmin', () => {
  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequest(
      mock(() => {
        throw new Error('invalid token');
      }),
    );
    const reply = buildReply();

    await requireEstablishmentAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('renvoie 403 pour un PLATFORM_ADMIN (ne paie pas à la place du client)', async () => {
    const request = buildRequest(
      mock(() => ({ userId: 'u1', email: 'platform@skolr.local', role: 'PLATFORM_ADMIN' })),
    );
    const reply = buildReply();

    await requireEstablishmentAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('renvoie 403 pour un ADMIN sans establishmentId', async () => {
    const request = buildRequest(
      mock(() => ({ userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN' })),
    );
    const reply = buildReply();

    await requireEstablishmentAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un ADMIN avec establishmentId et expose billingUser', async () => {
    const payload = { userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireEstablishmentAdmin(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.billingUser).toEqual(payload);
  });
});

describe('requirePlatformAdmin', () => {
  it('renvoie 403 pour un ADMIN', async () => {
    const request = buildRequest(
      mock(() => ({ userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' })),
    );
    const reply = buildReply();

    await requirePlatformAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un PLATFORM_ADMIN', async () => {
    const payload = { userId: 'u1', email: 'platform@skolr.local', role: 'PLATFORM_ADMIN' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requirePlatformAdmin(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.billingUser).toEqual(payload);
  });
});
