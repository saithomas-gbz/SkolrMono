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
