import type { AuthUser } from '~/composables/useAuth';

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const AUTH_USER_COOKIE = 'auth_user';

type JwtPayload = {
  userId?: string;
  email?: string;
  role?: string;
};

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') {
    return atob(base64);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/** Dérive `AuthUser` depuis le JWT auth-service (`userId`, `email`, `role`). */
export function authUserFromToken(token: string): AuthUser | null {
  const segment = token.split('.')[1];
  if (!segment) {
    return null;
  }
  try {
    const payload = JSON.parse(decodeBase64Url(segment)) as JwtPayload;
    if (!payload.userId || !payload.email || !payload.role) {
      return null;
    }
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function useAuthTokenCookie() {
  return useCookie<string | null>(AUTH_TOKEN_COOKIE, { sameSite: 'lax', default: () => null });
}

export function useAuthUserCookie() {
  return useCookie<AuthUser | null>(AUTH_USER_COOKIE, { sameSite: 'lax', default: () => null });
}
