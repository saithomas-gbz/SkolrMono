export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn, hasRole } = useAuth();
  if (!isLoggedIn.value) return navigateTo('/auth/login');
  if (!hasRole('TEACHER', 'STAFF')) return navigateTo('/dashboard');
});
