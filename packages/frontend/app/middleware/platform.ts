export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn, hasRole } = useAuth();
  if (!isLoggedIn.value) return navigateTo('/auth/login');
  // Strictement ce rôle : un ADMIN d'établissement n'a rien à voir ici, et le
  // backend le lui refuserait de toute façon (`requirePlatformAdmin`).
  if (!hasRole('PLATFORM_ADMIN')) return navigateTo('/dashboard');
});
