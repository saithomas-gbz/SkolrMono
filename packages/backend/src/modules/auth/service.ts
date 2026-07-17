import db from '../../shared/db';
import type { Role } from '../../generated/prisma/client';

export type UserInfo = { id: string; name: string | null; email: string };

/**
 * Infos publiques d'utilisateurs par ids.
 *
 * Service intra-process exposé par le module auth — remplace l'appel HTTP vers
 * l'ancien auth-service (`GET /users?ids=`). Réutilisé par parent et notification.
 */
export async function getUsersByIds(ids: string[]): Promise<UserInfo[]> {
  if (ids.length === 0) return [];
  return db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
}

/** Ids des utilisateurs ayant ce rôle. Remplace `GET /users?role=`. */
export async function getUserIdsByRole(role: string): Promise<string[]> {
  const users = await db.user.findMany({
    where: { role: role as Role },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// ---------------------------------------------------------------------------
// RGPD — droit d'accès / portabilité
// ---------------------------------------------------------------------------

/** Sujet d'un traitement RGPD : l'utilisateur concerné, identifié par id + email. */
export type RgpdSubject = { userId: string; email: string };

/**
 * Données personnelles du domaine `auth` (profil, comptes OAuth, jetons).
 * Les valeurs secrètes (mot de passe hashé, jetons bruts) sont volontairement
 * exclues : ce sont des données de sécurité, pas des données à porter.
 */
export async function collectRgpdData({ userId, email }: RgpdSubject) {
  const [profile, accounts, passwordResetTokens, invitations] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      omit: { password: true },
    }),
    db.account.findMany({
      where: { userId },
      select: { provider: true, providerId: true, createdAt: true },
    }),
    db.passwordResetToken.findMany({
      where: { userId },
      select: { createdAt: true, expiresAt: true, usedAt: true },
    }),
    db.invitationToken.findMany({
      where: { email },
      select: { role: true, establishmentId: true, createdAt: true, expiresAt: true, usedAt: true },
    }),
  ]);

  return { profile, accounts, passwordResetTokens, invitations };
}
