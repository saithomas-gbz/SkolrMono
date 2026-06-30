import { getUsersByIds as authGetUsersByIds, type UserInfo } from '../../auth/service';

/**
 * Anciennement un appel HTTP vers auth-service. Désormais un appel intra-process
 * au module auth (#114). Signature conservée pour ne pas toucher controllers/tests.
 */
export async function getUsersByIds(ids: string[]): Promise<UserInfo[]> {
  return authGetUsersByIds(ids);
}
