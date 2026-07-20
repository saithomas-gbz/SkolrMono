import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createHash } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mocke uniquement `shared/db` (comme tous les autres tests de contrôleurs) et
// laisse tourner le vrai refreshTokenService dessus — le mocker lui-même
// pollue le process pour les autres fichiers qui l'importent réellement
// (authController.ts, invitationController.ts, authRoutes.ts), cf. le piège
// `mock.module` documenté dans docs/tests/strategy.md.
const dbMock = {
  user: { findUnique: mock() },
  refreshToken: { create: mock(), findUnique: mock(), update: mock(), updateMany: mock() },
};
mock.module('../../../shared/db', () => ({ default: dbMock }));

const { default: authController } = await import('../controllers/authController');

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildRequest(body: Record<string, unknown>): FastifyRequest {
  return {
    body,
    server: { jwt: { sign: mock(() => 'new-access-token') } },
    log: { error: mock(), warn: mock(), info: mock() },
  } as unknown as FastifyRequest;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('authController.refresh', () => {
  beforeEach(() => {
    dbMock.user.findUnique.mockReset();
    dbMock.refreshToken.create.mockReset();
    dbMock.refreshToken.findUnique.mockReset();
    dbMock.refreshToken.update.mockReset();
    dbMock.refreshToken.updateMany.mockReset();
    dbMock.refreshToken.create.mockResolvedValue({});
    dbMock.refreshToken.update.mockResolvedValue({});
    dbMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  it('renvoie 401 si le jeton de rafraîchissement est invalide', async () => {
    dbMock.refreshToken.findUnique.mockResolvedValue(null);
    const request = buildRequest({ refreshToken: 'bad-token' });
    const reply = buildReply();

    await authController.refresh(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
  });

  it("renvoie 401 et révoque tout si l'utilisateur associé a été supprimé (RGPD) entre-temps", async () => {
    dbMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: hash('valid-but-account-deleted'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
    });
    dbMock.user.findUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() });
    const request = buildRequest({ refreshToken: 'valid-but-account-deleted' });
    const reply = buildReply();

    await authController.refresh(request, reply);

    // revokeAllForUser (déclenché par le compte supprimé) passe par updateMany.
    expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it("délivre un nouveau jeton d'accès + de rafraîchissement pour un jeton valide", async () => {
    dbMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: hash('valid-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
    });
    dbMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'eleve@skolr.local',
      name: 'Élève',
      role: 'USER',
      establishmentId: null,
      deletedAt: null,
    });
    const request = buildRequest({ refreshToken: 'valid-token' });
    const reply = buildReply();

    await authController.refresh(request, reply);

    expect(reply.send).toHaveBeenCalledWith({
      token: 'new-access-token',
      refreshToken: expect.any(String),
      user: {
        id: 'user-1',
        email: 'eleve@skolr.local',
        name: 'Élève',
        role: 'USER',
        establishmentId: null,
      },
    });
    // Rotation réelle : l'ancien jeton est marqué révoqué.
    expect(dbMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date), replacedByTokenHash: expect.any(String) },
    });
  });
});

describe('authController.logout', () => {
  beforeEach(() => {
    dbMock.refreshToken.updateMany.mockReset();
    dbMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  it('révoque le jeton fourni et renvoie 200', async () => {
    const request = buildRequest({ refreshToken: 'some-token' });
    const reply = buildReply();

    await authController.logout(request, reply);

    expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hash('some-token'), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(reply.send).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});
