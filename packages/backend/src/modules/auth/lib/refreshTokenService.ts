import { randomBytes, createHash } from 'crypto';
import db from '../../../shared/db';

/** Jeton d'accès (JWT) — courte durée, stateless, non révocable avant expiration. */
export const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';

const REFRESH_TOKEN_EXPIRES_IN_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 30);

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function newExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
}

/** Génère et persiste un nouveau jeton de rafraîchissement (hash seul en base). */
export async function issueRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(40).toString('hex');
  const expiresAt = newExpiry();
  await db.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

type RotateResult =
  | { ok: true; userId: string; token: string; expiresAt: Date }
  | { ok: false; reason: 'not_found' | 'expired' | 'revoked' | 'reuse_detected' };

/**
 * Échange un jeton de rafraîchissement valide contre un nouveau (rotation à
 * chaque usage) : l'ancien est marqué révoqué et remplacé, un nouveau est émis.
 *
 * Si le jeton présenté est déjà marqué révoqué, c'est le signe qu'un jeton déjà
 * échangé (donc normalement mort) est réutilisé — signal de vol de jeton. Dans
 * ce cas, TOUS les jetons actifs de l'utilisateur sont révoqués (déconnexion
 * forcée de toutes les sessions) plutôt que de simplement refuser cette requête.
 */
export async function rotateRefreshToken(rawToken: string): Promise<RotateResult> {
  const tokenHash = hashToken(rawToken);
  const existing = await db.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    return { ok: false, reason: 'not_found' };
  }
  if (existing.revokedAt) {
    await revokeAllForUser(existing.userId);
    return { ok: false, reason: 'reuse_detected' };
  }
  if (existing.expiresAt < new Date()) {
    return { ok: false, reason: 'expired' };
  }

  const next = await issueRefreshToken(existing.userId);
  await db.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), replacedByTokenHash: hashToken(next.token) },
  });

  return { ok: true, userId: existing.userId, token: next.token, expiresAt: next.expiresAt };
}

/** Révoque un unique jeton de rafraîchissement (logout). Idempotent. */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Révoque tous les jetons actifs d'un utilisateur (vol détecté, effacement RGPD). */
export async function revokeAllForUser(userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
