import {
  getUserIdsByRole as authGetUserIdsByRole,
  getUsersByIds as authGetUsersByIds,
  type UserInfo,
} from '../../auth/service';

/**
 * Anciennement des appels HTTP vers auth-service. Désormais des appels
 * intra-process au module auth (#114). Signatures conservées pour ne pas toucher
 * consumers/controllers ni les tests qui mockent ce module.
 */
export async function getUserIdsByRole(role: string): Promise<string[]> {
  return authGetUserIdsByRole(role);
}

export async function getUsersByIds(ids: string[]): Promise<UserInfo[]> {
  return authGetUsersByIds(ids);
}
