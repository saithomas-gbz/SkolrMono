import {
  authUserFromToken,
  isTokenExpired,
  useAuthTokenState,
  useAuthUserState,
  writeAuthToken,
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

  function setSession(token: string, sessionUser?: AuthUser) {
    writeAuthToken(token);
    writeAuthUser(sessionUser ?? authUserFromToken(token));
  }

  function clearSession() {
    writeAuthToken(null);
    writeAuthUser(null);
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
        setSession(response.token, response.user);
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
        setSession(response.token, response.user);
      }
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Démarre le flux Google OAuth — doit être une vraie navigation (pas un fetch) : le
   * gateway répond par une redirection 302 vers Google que seul le navigateur peut suivre.
   */
  function googleLoginUrl(): string {
    const config = useRuntimeConfig();
    const base = String(config.public.gatewayDirectUrl).replace(/\/$/, '');
    return `${base}/auth/login/google`;
  }

  return {
    register,
    login,
    googleLoginUrl,
    setSession,
    clearSession,
    isLoggedIn,
    user,
    userId,
    role,
    hasRole,
  };
}
