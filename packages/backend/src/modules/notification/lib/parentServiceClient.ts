import { getParentIds as parentGetParentIds } from '../../parent/service';

/**
 * Anciennement un appel HTTP vers parent-service. Désormais un appel intra-process
 * au module parent (#114). Signature conservée pour ne pas toucher consumers/tests.
 */
export async function getParentIds(studentId: string): Promise<string[]> {
  return parentGetParentIds(studentId);
}
