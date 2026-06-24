import { describe, it, expect, mock } from 'bun:test';
import { requireEstablishmentAdmin, requireAuth, requireSelfOrAdmin } from '../lib/authGuard';
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

  it('renvoie 403 pour un PLATFORM_ADMIN (n\'appartient à aucun établissement)', async () => {
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

  it('renvoie 403 pour un rôle non-admin (ex. TEACHER)', async () => {
    const request = buildRequest(
      mock(() => ({ userId: 'u1', email: 'teacher@skolr.local', role: 'TEACHER', establishmentId: 'est-1' })),
    );
    const reply = buildReply();

    await requireEstablishmentAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un ADMIN avec establishmentId et expose authUser', async () => {
    const payload = { userId: 'u1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireEstablishmentAdmin(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.authUser).toEqual(payload);
  });
});

describe('requireAuth', () => {
  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequest(
      mock(() => {
        throw new Error('invalid token');
      }),
    );
    const reply = buildReply();

    await requireAuth(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('laisse passer tout rôle connu et expose authUser', async () => {
    const payload = { userId: 'u1', email: 'user@skolr.local', role: 'USER' };
    const request = buildRequest(mock(() => payload));
    const reply = buildReply();

    await requireAuth(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.authUser).toEqual(payload);
  });
});

describe('requireSelfOrAdmin', () => {
  function buildRequestWithParams(verify: ReturnType<typeof mock>, id: string): FastifyRequest {
    return {
      headers: { authorization: 'Bearer token' },
      server: { jwt: { verify } },
      params: { id },
    } as unknown as FastifyRequest;
  }

  it('renvoie 401 si le token est invalide', async () => {
    const request = buildRequestWithParams(
      mock(() => {
        throw new Error('invalid token');
      }),
      'user-1',
    );
    const reply = buildReply();

    await requireSelfOrAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('renvoie 403 si un USER tente de modifier un autre profil', async () => {
    const request = buildRequestWithParams(
      mock(() => ({ userId: 'user-1', email: 'user@skolr.local', role: 'USER' })),
      'user-2',
    );
    const reply = buildReply();

    await requireSelfOrAdmin(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('laisse passer un USER modifiant son propre profil', async () => {
    const payload = { userId: 'user-1', email: 'user@skolr.local', role: 'USER' };
    const request = buildRequestWithParams(mock(() => payload), 'user-1');
    const reply = buildReply();

    await requireSelfOrAdmin(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.authUser).toEqual(payload);
  });

  it('laisse passer un ADMIN modifiant le profil d\'un autre utilisateur', async () => {
    const payload = { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN' };
    const request = buildRequestWithParams(mock(() => payload), 'user-2');
    const reply = buildReply();

    await requireSelfOrAdmin(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.authUser).toEqual(payload);
  });

  it('laisse passer un PLATFORM_ADMIN modifiant le profil d\'un autre utilisateur', async () => {
    const payload = { userId: 'platform-1', email: 'platform@skolr.local', role: 'PLATFORM_ADMIN' };
    const request = buildRequestWithParams(mock(() => payload), 'user-2');
    const reply = buildReply();

    await requireSelfOrAdmin(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.authUser).toEqual(payload);
  });
});
