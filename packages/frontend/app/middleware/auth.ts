import { refreshSession, useAuthRefreshTokenCookie } from '~/composables/authSession';

export default defineNuxtRouteMiddleware(async () => {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn.value) {
    return;
  }

  // Jeton d'accès absent/expiré mais un jeton de rafraîchissement existe encore :
  // tenter un rafraîchissement silencieux avant de rediriger vers le login.
  if (useAuthRefreshTokenCookie().value) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return;
    }
  }

  return navigateTo('/auth/login');
});
