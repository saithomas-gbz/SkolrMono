import {
  authUserFromToken,
  isTokenExpired,
  useAuthRefreshTokenCookie,
  useAuthTokenState,
  useAuthUserState,
  writeAuthToken,
  writeAuthRefreshToken,
  writeAuthUser,
} from '~/composables/authSession';

/** Forme minimale des erreurs $fetch / ofetch (évite une dépendance directe pour Knip). */
type FetchErrorLike = { data?: { error?: string } };

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

export type AuthSuccess = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};

export type AuthRole = AuthUser['role'];

const serverErrorHints: Record<string, string> = {
  'Invalid credentials': 'Identifiants incorrects.',
  'User already exists': 'Un compte existe déjà avec cet email.',
  'Internal server error': 'Erreur serveur. Réessayez plus tard.',
};

export function normalizeAuthError(e: unknown): string {
  const data = (e as FetchErrorLike).data;
  if (data?.error && typeof data.error === 'string') {
    return serverErrorHints[data.error] ?? data.error;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'Erreur inconnue';
}

/** Aligné sur `auth-service` OpenAPI (`password` minLength 6). */
export const AUTH_PASSWORD_MIN_LENGTH = 6;

export const AUTH_EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Politiques de champs identifiants (login / register).
 * Passe les refs des champs pour des vérifications réactives.
 */
export function useAuthCredentialPolicy(email: Ref<string>, password: Ref<string>) {
  const trimmedEmail = computed(() => email.value.trim());

  const satisfiesEmailNonEmpty = computed(() => trimmedEmail.value.length > 0);
  const satisfiesEmailFormat = computed(() => AUTH_EMAIL_FORMAT_REGEX.test(trimmedEmail.value));
  const satisfiesEmailPolicy = computed(
    () => satisfiesEmailNonEmpty.value && satisfiesEmailFormat.value,
  );

  const satisfiesPasswordNonEmpty = computed(() => password.value.length > 0);
  const satisfiesPasswordMinLength = computed(
    () => password.value.length >= AUTH_PASSWORD_MIN_LENGTH,
  );
  const satisfiesPasswordPolicy = computed(
    () => satisfiesPasswordNonEmpty.value && satisfiesPasswordMinLength.value,
  );

  const satisfiesLoginRegisterFields = computed(
    () => satisfiesEmailPolicy.value && satisfiesPasswordPolicy.value,
  );

  return {
    trimmedEmail,
    satisfiesEmailNonEmpty,
    satisfiesEmailFormat,
    satisfiesEmailPolicy,
    satisfiesPasswordNonEmpty,
    satisfiesPasswordMinLength,
    satisfiesPasswordPolicy,
    satisfiesLoginRegisterFields,
  };
}
export function useAuth() {
  const api = useApi();
  const authToken = useAuthTokenState();
  const authUser = useAuthUserState();
  const isLoggedIn = computed(() => {
    const token = authToken.value?.trim();
    return Boolean(token) && !isTokenExpired(token as string);
  });
  const user = computed(() => authUser.value);
  const userId = computed(() => authUser.value?.id ?? null);
  const role = computed(() => authUser.value?.role ?? null);

  /**
   * `refreshToken` est optionnel : un `undefined` explicite préserve celui déjà
   * stocké (cas d'un endpoint qui rafraîchit le profil sans émettre de nouveaux
   * jetons, ex. `profile.vue`) plutôt que d'effacer la session de rafraîchissement.
   */
  function setSession(token: string, refreshToken?: string, sessionUser?: AuthUser) {
    writeAuthToken(token);
    if (refreshToken !== undefined) {
      writeAuthRefreshToken(refreshToken);
    }
    writeAuthUser(sessionUser ?? authUserFromToken(token));
  }

  function clearSession() {
    writeAuthToken(null);
    writeAuthRefreshToken(null);
    writeAuthUser(null);
  }

  /**
   * Révoque le jeton de rafraîchissement côté serveur (best-effort — la session locale est
   * de toute façon effacée même en cas d'échec réseau) puis nettoie la session locale.
   */
  async function logout() {
    const refreshToken = useAuthRefreshTokenCookie().value;
    if (refreshToken) {
      try {
        await api('/auth/logout', { method: 'POST', body: { refreshToken } });
      } catch (error) {
        console.error(error);
      }
    }
    clearSession();
  }

  function hasRole(...roles: AuthRole[]) {
    const currentRole = authUser.value?.role;
    return Boolean(currentRole && roles.includes(currentRole));
  }

  async function register(email: string, password: string, name?: string) {
    try {
      const response = await api<AuthSuccess>('/auth/register', {
        method: 'POST',
        body: {
          email,
          password,
          ...(name?.trim() ? { name: name.trim() } : {}),
        },
      });
      if (response.token) {
        setSession(response.token, response.refreshToken, response.user);
      }
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      const response: AuthSuccess = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (response.token) {
        setSession(response.token, response.refreshToken, response.user);
      }
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return {
    register,
    login,
    setSession,
    clearSession,
    logout,
    isLoggedIn,
    user,
    userId,
    role,
    hasRole,
  };
}
