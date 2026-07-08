export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn, hasRole } = useAuth();
  if (!isLoggedIn.value) return navigateTo('/auth/login');
  if (!hasRole('ADMIN', 'TEACHER', 'STAFF')) return navigateTo('/dashboard');
});
