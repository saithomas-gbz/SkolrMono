import { normalizeApiError } from '~/composables/useClass';

/** Profil public d'un utilisateur (aligné sur `userOpenApi` côté auth-service). */
export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  role: 'USER' | 'TEACHER' | 'STAFF' | 'ADMIN' | 'PARENT';
  createdAt?: string;
};

type UsersApiResponse = {
  data: UserProfile[];
};

const userErrorHints: Record<string, string> = {
  'Email already in use': 'Cet email est déjà utilisé par un autre compte.',
  'Current password is incorrect': "L'ancien mot de passe est incorrect.",
  'Password change not available for this account':
    "Le changement de mot de passe n'est pas disponible pour ce compte (connexion via Google).",
};

export function normalizeUserError(e: unknown): string {
  const base = normalizeApiError(e);
  return userErrorHints[base] ?? base;
}

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

  /** Met à jour le nom/email de l'utilisateur (self-service, cf. `requireSelfOrAdmin` côté auth-service). */
  async function updateProfile(id: string, body: { name?: string; email?: string }) {
    return api<UserProfile>(`/auth/users/${id}`, {
      method: 'PUT',
      body,
    });
  }

  /** Change le mot de passe de l'utilisateur authentifié (ancien mot de passe requis). */
  async function changePassword(currentPassword: string, newPassword: string) {
    return api<{ message: string }>('/auth/users/me/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    });
  }

  async function fetchAllUsers() {
    const roles = ['TEACHER', 'USER', 'STAFF', 'ADMIN', 'PARENT'];
    const responses = await Promise.all(
      roles.map((role) =>
        api<UsersApiResponse>('/auth/users', { query: { role } }).catch(() => ({ data: [] as UserProfile[] })),
      ),
    );
    const allUsers = responses.flatMap((r) => r.data);
    const seen = new Set<string>();
    return allUsers.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }

  return {
    fetchUsersByIds,
    fetchAllUsers,
    updateProfile,
    changePassword,
    normalizeApiError,
  };
}

/** Libellé d'option pour les dropdowns de sélection d'utilisateur : "Nom (uuid)". */
export function userOptionLabel(user: Pick<UserProfile, 'id' | 'name' | 'email'>): string {
  return `${user.name?.trim() || user.email} (${user.id})`;
}
