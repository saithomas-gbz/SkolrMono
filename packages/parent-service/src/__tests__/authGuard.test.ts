import { describe, it, expect, mock } from 'bun:test';
import { requireParent, requireAdminOrStaff } from '../lib/authGuard';
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

describe('requireParent', () => {
  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequest(mock(() => { throw new Error('invalid token'); }));
    const reply = buildReply();

    await requireParent(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('renvoie 403 pour un rôle différent de PARENT', async () => {
    const request = buildRequest(mock(() => ({ userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN' })));
    const reply = buildReply();

    await requireParent(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un PARENT et expose parentUser', async () => {
    const payload = { userId: 'parent-1', email: 'parent@skolr.local', role: 'PARENT' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireParent(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.parentUser).toEqual(payload);
  });
});

describe('requireAdminOrStaff', () => {
  it('renvoie 403 pour un PARENT', async () => {
    const request = buildRequest(mock(() => ({ userId: 'p1', email: 'parent@skolr.local', role: 'PARENT' })));
    const reply = buildReply();

    await requireAdminOrStaff(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un STAFF', async () => {
    const payload = { userId: 's1', email: 'staff@skolr.local', role: 'STAFF' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireAdminOrStaff(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.parentUser).toEqual(payload);
  });
});
