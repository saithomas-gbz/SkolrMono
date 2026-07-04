import { describe, it, expect, mock } from 'bun:test';
import { requireAuth, requireStaff, requireSelfOrStaff } from '../lib/authGuard';
import type { FastifyReply, FastifyRequest } from 'fastify';

function buildRequest(verify: ReturnType<typeof mock>, params: Record<string, string> = {}): FastifyRequest {
  return {
    headers: { authorization: 'Bearer token' },
    server: { jwt: { verify } },
    params,
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

  it('laisse passer un USER et expose request.gradeUser', async () => {
    const payload = { userId: 'u1', email: 'eleve@skolr.local', role: 'USER' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireAuth(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.gradeUser).toEqual(payload);
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

  it('laisse passer un TEACHER', async () => {
    const payload = { userId: 't1', email: 'prof@skolr.local', role: 'TEACHER' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireStaff(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.gradeUser).toEqual(payload);
  });
});

describe('requireSelfOrStaff', () => {
  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequest(mock(() => { throw new Error('invalid token'); }), { userId: 'u1' });
    const reply = buildReply();

    await requireSelfOrStaff(request as never, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it("laisse passer un USER consultant ses propres notes", async () => {
    const payload = { userId: 'u1', email: 'eleve@skolr.local', role: 'USER' };
    const request = buildRequest(mock(() => payload), { userId: 'u1' });
    const reply = buildReply();

    await requireSelfOrStaff(request as never, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.gradeUser).toEqual(payload);
  });

  it("renvoie 403 pour un USER consultant les notes d'un autre élève", async () => {
    const payload = { userId: 'u1', email: 'eleve@skolr.local', role: 'USER' };
    const request = buildRequest(mock(() => payload), { userId: 'u2' });
    const reply = buildReply();

    await requireSelfOrStaff(request as never, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it("laisse passer un TEACHER consultant les notes de n'importe quel élève", async () => {
    const payload = { userId: 't1', email: 'prof@skolr.local', role: 'TEACHER' };
    const request = buildRequest(mock(() => payload), { userId: 'u2' });
    const reply = buildReply();

    await requireSelfOrStaff(request as never, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });
});
