import { describe, it, expect, mock } from 'bun:test';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireAdmin, requireSelfOrAdmin } from '../authGuard';

type Payload = { userId: string; email: string; role: string; establishmentId?: string };

/** Requête factice dont `server.jwt.verify` renvoie `payload` (ou lève si null). */
function makeRequest(payload: Payload | null, params: Record<string, string> = {}) {
  return {
    headers: { authorization: 'Bearer token' },
    params,
    server: {
      jwt: {
        verify: mock(() => {
          if (!payload) throw new Error('invalid');
          return payload;
        }),
      },
    },
  } as unknown as FastifyRequest;
}

function makeReply() {
  const reply = {
    status: mock(() => reply),
    send: mock(() => reply),
  };
  return reply as unknown as FastifyReply & { status: ReturnType<typeof mock>; send: ReturnType<typeof mock> };
}

describe('shared authGuard', () => {
  describe('requireAuth', () => {
    it('attache authUser pour un token valide', async () => {
      const req = makeRequest({ userId: 'u1', email: 'a@x.io', role: 'USER' });
      const reply = makeReply();
      await requireAuth(req, reply);
      expect(req.authUser?.userId).toBe('u1');
      expect(reply.status).not.toHaveBeenCalled();
    });

    it('renvoie 401 sans token valide', async () => {
      const req = makeRequest(null);
      const reply = makeReply();
      await requireAuth(req, reply);
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(req.authUser).toBeUndefined();
    });
  });

  describe('requireAdmin', () => {
    it('autorise un ADMIN', async () => {
      const req = makeRequest({ userId: 'a1', email: 'admin@x.io', role: 'ADMIN' });
      const reply = makeReply();
      await requireAdmin(req, reply);
      expect(req.authUser?.role).toBe('ADMIN');
      expect(reply.status).not.toHaveBeenCalled();
    });

    it('autorise un PLATFORM_ADMIN', async () => {
      const req = makeRequest({ userId: 'p1', email: 'padmin@x.io', role: 'PLATFORM_ADMIN' });
      const reply = makeReply();
      await requireAdmin(req, reply);
      expect(reply.status).not.toHaveBeenCalled();
    });

    it('refuse un rôle non-admin (403)', async () => {
      const req = makeRequest({ userId: 'u1', email: 'user@x.io', role: 'USER' });
      const reply = makeReply();
      await requireAdmin(req, reply);
      expect(reply.status).toHaveBeenCalledWith(403);
      expect(req.authUser).toBeUndefined();
    });

    it('refuse sans token (401)', async () => {
      const req = makeRequest(null);
      const reply = makeReply();
      await requireAdmin(req, reply);
      expect(reply.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('autorise un utilisateur sur son propre profil', async () => {
      const req = makeRequest({ userId: 'u1', email: 'u@x.io', role: 'USER' }, { id: 'u1' }) as FastifyRequest<{
        Params: { id: string };
      }>;
      const reply = makeReply();
      await requireSelfOrAdmin(req, reply);
      expect(reply.status).not.toHaveBeenCalled();
    });

    it("refuse un utilisateur sur le profil d'un autre (403)", async () => {
      const req = makeRequest({ userId: 'u1', email: 'u@x.io', role: 'USER' }, { id: 'u2' }) as FastifyRequest<{
        Params: { id: string };
      }>;
      const reply = makeReply();
      await requireSelfOrAdmin(req, reply);
      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });
});
