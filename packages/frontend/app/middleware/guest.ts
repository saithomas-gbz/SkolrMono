export default defineNuxtRouteMiddleware(() => {
  const token = useCookie<string | null>('auth_token', { sameSite: 'lax', default: () => null });
  if (token.value?.trim()) {
    return navigateTo('/');
  }
});
