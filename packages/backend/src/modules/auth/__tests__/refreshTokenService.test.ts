import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createHash } from 'crypto';

const dbMock = {
  refreshToken: {
    create: mock(),
    findUnique: mock(),
    update: mock(),
    updateMany: mock(),
  },
};

mock.module('../../../shared/db', () => ({ default: dbMock }));

const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} = await import('../lib/refreshTokenService');

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('refreshTokenService', () => {
  beforeEach(() => {
    dbMock.refreshToken.create.mockReset();
    dbMock.refreshToken.findUnique.mockReset();
    dbMock.refreshToken.update.mockReset();
    dbMock.refreshToken.updateMany.mockReset();
    dbMock.refreshToken.create.mockResolvedValue({});
    dbMock.refreshToken.update.mockResolvedValue({});
    dbMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('issueRefreshToken', () => {
    it('génère un jeton opaque à haute entropie et persiste son hash (jamais la valeur brute)', async () => {
      const { token, expiresAt } = await issueRefreshToken('user-1');

      expect(token).toMatch(/^[0-9a-f]{80}$/); // randomBytes(40).toString('hex')
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(dbMock.refreshToken.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', tokenHash: hash(token), expiresAt },
      });
      // La valeur brute ne doit jamais transiter vers la couche de persistance.
      const createCall = dbMock.refreshToken.create.mock.calls[0]![0] as { data: { tokenHash: string } };
      expect(createCall.data.tokenHash).not.toBe(token);
    });
  });

  describe('rotateRefreshToken', () => {
    it("refuse un jeton inconnu", async () => {
      dbMock.refreshToken.findUnique.mockResolvedValue(null);

      const result = await rotateRefreshToken('unknown-token');

      expect(result).toEqual({ ok: false, reason: 'not_found' });
    });

    it('refuse un jeton expiré', async () => {
      dbMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hash('some-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await rotateRefreshToken('some-token');

      expect(result).toEqual({ ok: false, reason: 'expired' });
    });

    it('détecte la réutilisation d\'un jeton déjà révoqué et révoque toute la chaîne (vol de jeton)', async () => {
      dbMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hash('stolen-token'),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100_000),
      });

      const result = await rotateRefreshToken('stolen-token');

      expect(result).toEqual({ ok: false, reason: 'reuse_detected' });
      expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('délivre un nouveau jeton et révoque l\'ancien (rotation) pour un jeton valide', async () => {
      dbMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hash('valid-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100_000),
      });

      const result = await rotateRefreshToken('valid-token');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.userId).toBe('user-1');
        expect(result.token).not.toBe('valid-token');
        expect(result.token).toMatch(/^[0-9a-f]{80}$/);
      }
      expect(dbMock.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date), replacedByTokenHash: expect.any(String) },
      });
    });
  });

  describe('revokeRefreshToken', () => {
    it('révoque uniquement le jeton actif correspondant (idempotent)', async () => {
      await revokeRefreshToken('some-token');

      expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hash('some-token'), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllForUser', () => {
    it('révoque tous les jetons actifs d\'un utilisateur', async () => {
      await revokeAllForUser('user-1');

      expect(dbMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
