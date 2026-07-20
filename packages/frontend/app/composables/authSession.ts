import type { AuthUser } from '~/composables/useAuth';

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const AUTH_USER_COOKIE = 'auth_user';
const AUTH_REFRESH_TOKEN_COOKIE = 'auth_refresh_token';

type JwtPayload = {
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') {
    return atob(base64);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const segment = token.split('.')[1];
  if (!segment) {
    return null;
  }
  try {
    return JSON.parse(decodeBase64Url(segment)) as JwtPayload;
  } catch {
    return null;
  }
}

/** Dérive `AuthUser` depuis le JWT auth-service (`userId`, `email`, `role`). */
export function authUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.userId || !payload.email || !payload.role) {
    return null;
  }
  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
  };
}

/** `true` si le token est indécodable, dépourvu de claim `exp`, ou déjà expiré. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}

const AUTH_COOKIE_OPTIONS = { sameSite: 'lax' as const, default: () => null };

export function useAuthTokenCookie() {
  return useCookie<string | null>(AUTH_TOKEN_COOKIE, AUTH_COOKIE_OPTIONS);
}

export function useAuthUserCookie() {
  return useCookie<AuthUser | null>(AUTH_USER_COOKIE, AUTH_COOKIE_OPTIONS);
}

export function useAuthRefreshTokenCookie() {
  return useCookie<string | null>(AUTH_REFRESH_TOKEN_COOKIE, AUTH_COOKIE_OPTIONS);
}

export function useAuthTokenState() {
  const cookie = useAuthTokenCookie();
  return useState<string | null>(AUTH_TOKEN_COOKIE, () => cookie.value ?? null);
}

export function useAuthUserState() {
  const cookie = useAuthUserCookie();
  return useState<AuthUser | null>(AUTH_USER_COOKIE, () => cookie.value ?? null);
}

export function writeAuthToken(token: string | null) {
  useAuthTokenState().value = token;
  useAuthTokenCookie().value = token;
}

export function writeAuthUser(user: AuthUser | null) {
  useAuthUserState().value = user;
  useAuthUserCookie().value = user;
}

export function writeAuthRefreshToken(refreshToken: string | null) {
  useAuthRefreshTokenCookie().value = refreshToken;
}

type RefreshResponse = { token: string; refreshToken: string; user: AuthUser };

// Un seul rafraîchissement en vol à la fois (partagé par useApi.ts et
// useAuth.ts/middleware) : le jeton de rafraîchissement est à usage unique
// (rotation côté serveur), donc deux appels concurrents avec le même jeton
// feraient détecter un « vol » et déconnecteraient l'utilisateur — voir
// packages/backend/src/modules/auth/lib/refreshTokenService.ts.
let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const rawRefreshToken = useAuthRefreshTokenCookie().value;
  if (!rawRefreshToken) {
    return false;
  }
  // Capturés avant le premier `await` : en SSR, le contexte Nuxt implicite ne
  // survit pas à une frontière async, donc tout composable appelé après le
  // `$fetch` ci-dessous (via `writeAuthToken`/`writeAuthUser`, qui font
  // `useCookie`/`useState`) doit être ré-enveloppé avec `runWithContext`.
  const nuxtApp = useNuxtApp();
  const config = useRuntimeConfig();
  try {
    const response = await $fetch<RefreshResponse>('/auth/refresh', {
      baseURL: config.public.gatewayBaseUrl,
      method: 'POST',
      credentials: 'include',
      body: { refreshToken: rawRefreshToken },
    });
    nuxtApp.runWithContext(() => {
      writeAuthToken(response.token);
      writeAuthRefreshToken(response.refreshToken);
      writeAuthUser(response.user);
    });
    return true;
  } catch {
    nuxtApp.runWithContext(() => {
      writeAuthToken(null);
      writeAuthRefreshToken(null);
      writeAuthUser(null);
    });
    return false;
  }
}

/** Échange le jeton de rafraîchissement stocké contre un nouveau jeton d'accès. */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
