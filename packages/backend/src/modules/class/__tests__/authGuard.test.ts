import { describe, it, expect, mock } from 'bun:test';
import { requireAuth, requireStaff } from '../lib/authGuard';
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

describe('requireAuth', () => {
  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequest(mock(() => { throw new Error('invalid token'); }));
    const reply = buildReply();

    await requireAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('laisse passer un USER et expose request.classUser', async () => {
    const payload = { userId: 'u1', email: 'eleve@skolr.local', role: 'USER' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireAuth(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.classUser).toEqual(payload);
  });
});

describe('requireStaff', () => {
  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequest(mock(() => { throw new Error('invalid token'); }));
    const reply = buildReply();

    await requireStaff(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('renvoie 403 pour un USER (élève)', async () => {
    const request = buildRequest(mock(() => ({ userId: 'u1', email: 'eleve@skolr.local', role: 'USER' })));
    const reply = buildReply();

    await requireStaff(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un ADMIN', async () => {
    const payload = { userId: 'a1', email: 'admin@skolr.local', role: 'ADMIN' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireStaff(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.classUser).toEqual(payload);
  });
});
