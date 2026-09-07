export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn, hasRole } = useAuth();
  if (!isLoggedIn.value) return navigateTo('/auth/login');
  // Aligné sur le garde backend `requireStaff`, qui inclut ADMIN : sans lui,
  // un administrateur se voyait refuser des écrans que l'API lui ouvre (#235).
  if (!hasRole('TEACHER', 'STAFF', 'ADMIN')) return navigateTo('/dashboard');
});
