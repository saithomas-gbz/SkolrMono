import { getChildIds as parentGetChildIds } from '../../parent/service';

/**
 * Anciennement un appel HTTP vers parent-service. Désormais un appel intra-process
 * au module parent (#114). Signature conservée pour ne pas toucher controllers/tests.
 */

/** Enfants rattachés à ce parent — restreint absences/justifications (issue #81). */
export async function getChildIds(parentId: string): Promise<string[]> {
  return parentGetChildIds(parentId);
}
