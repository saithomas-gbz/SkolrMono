import { normalizeApiError } from '~/composables/useClass';

/** Profil public d'un utilisateur (aligné sur `userOpenApi` côté auth-service). */
export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  role: 'USER' | 'TEACHER' | 'STAFF' | 'ADMIN';
};

export type UsersApiResponse = {
  data: UserProfile[];
};

export function useUser() {
  const api = useApi();

  /**
   * Résolution par lot des profils utilisateurs (ex. noms des élèves d'une classe).
   * Renvoie un tableau vide sans appel réseau si aucun id n'est fourni.
   */
  async function fetchUsersByIds(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter((id) => id.trim().length > 0)));
    if (uniqueIds.length === 0) {
      return [] as UserProfile[];
    }
    const response = await api<UsersApiResponse>('/auth/users', {
      query: { ids: uniqueIds.join(',') },
    });
    return response.data;
  }

  return {
    fetchUsersByIds,
    normalizeApiError,
  };
}
