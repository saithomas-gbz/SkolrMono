import db from '../../shared/db';

/**
 * Identifiants des élèves rattachés à ce parent.
 *
 * Service intra-process exposé par le module parent — remplace l'appel HTTP vers
 * l'ancien parent-service (`GET /children?parentId=`). (issue #81)
 */
export async function getChildIds(parentId: string): Promise<string[]> {
  const rows = await db.parentStudent.findMany({
    where: { parentId },
    select: { studentId: true },
  });
  return rows.map((r) => r.studentId);
}

/**
 * Ids des parents rattachés à cet élève — utilisé pour les notifier sur les
 * événements d'absence (issue #81). Remplace `GET /parents?studentId=`.
 */
export async function getParentIds(studentId: string): Promise<string[]> {
  const rows = await db.parentStudent.findMany({
    where: { studentId },
    select: { parentId: true },
  });
  return [...new Set(rows.map((r) => r.parentId))];
}

/**
 * RGPD — liens de parenté de l'utilisateur, qu'il soit le parent ou l'élève.
 * Seuls des `userId` nus sont stockés ici (aucune PII directe).
 */
export async function collectRgpdData(userId: string) {
  const [asParent, asChild] = await Promise.all([
    db.parentStudent.findMany({
      where: { parentId: userId },
      select: { studentId: true, linkType: true, isPrimary: true, createdAt: true },
    }),
    db.parentStudent.findMany({
      where: { studentId: userId },
      select: { parentId: true, linkType: true, isPrimary: true, createdAt: true },
    }),
  ]);
  return { asParent, asChild };
}
