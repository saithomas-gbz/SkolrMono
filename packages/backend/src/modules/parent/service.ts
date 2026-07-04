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
