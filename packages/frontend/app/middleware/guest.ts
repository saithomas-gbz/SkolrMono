import { useAuthTokenCookie } from '~/composables/authSession';

export default defineNuxtRouteMiddleware(() => {
  const authTokenCookie = useAuthTokenCookie();
  if (authTokenCookie.value?.trim()) {
    return navigateTo('/');
  }
});
