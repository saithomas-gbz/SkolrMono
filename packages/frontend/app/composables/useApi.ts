import {
  isTokenExpired,
  refreshSession,
  useAuthRefreshTokenCookie,
  useAuthTokenCookie,
  useAuthTokenState,
  useAuthUserCookie,
  useAuthUserState,
} from '~/composables/authSession';

const LOGIN_PATH = '/auth/login';

export function useApi() {
  const config = useRuntimeConfig();
  const authTokenCookie = useAuthTokenCookie();
  const authUserCookie = useAuthUserCookie();
  const authRefreshTokenCookie = useAuthRefreshTokenCookie();
  const authToken = useAuthTokenState();
  const authUser = useAuthUserState();
  // `useApi` est aussi appelé hors setup (middleware de route) : ne capturer ici que des
  // composables Nuxt sûrs hors setup. Le toast « session expirée » est géré par la page login
  // (contexte setup) via le flag de query `expired`.
  const nuxtApp = useNuxtApp();
  const router = useRouter();

  return $fetch.create({
    baseURL: config.public.gatewayBaseUrl,
    credentials: 'include',
    // Autorise un retry sur 401 pour toutes les méthodes (POST/PUT/DELETE inclus — ofetch ne
    // retry par défaut que les GET) : c'est ce retry qui laisse une chance au rafraîchissement
    // silencieux ci-dessous avant d'abandonner la requête.
    retry: 1,
    retryStatusCodes: [401],
    async onRequest({ options }) {
      let token = authToken.value?.trim();
      // Rafraîchissement proactif : évite un aller-retour 401 garanti pour le cas courant
      // (jeton d'accès de 15 min expiré alors que le jeton de rafraîchissement est encore valide).
      if (token && isTokenExpired(token)) {
        const refreshed = await refreshSession();
        token = refreshed ? (authToken.value?.trim() ?? undefined) : undefined;
      }
      if (!token) {
        return;
      }
      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set('Authorization', `Bearer ${token}`);
      options.headers = headers;
    },
    async onResponseError({ request, response, options }) {
      const status = response?.status;
      if (status !== 401 && status !== 403) {
        return;
      }

      // Les endpoints d'auth (login/register/refresh/logout) : un 401 y a un sens local
      // (identifiants incorrects, jeton de rafraîchissement invalide) — ne pas déclencher
      // le rafraîchissement ni le logout global.
      const url = typeof request === 'string' ? request : request.url;
      if (url.includes('/auth/')) {
        return;
      }

      // `options.retry` reflète les tentatives RESTANTES à ce stade : > 0 signifie qu'ofetch
      // va retenter la requête (cf. `retry: 1` ci-dessus) — on tente un rafraîchissement
      // silencieux pour que cette tentative reparte avec un jeton d'accès valide.
      if (status === 401 && (options.retry ?? 0) > 0) {
        const refreshed = await refreshSession();
        if (refreshed) {
          return;
        }
      }

      // Garde anti-doublon : les panels tirent en parallèle. Le 1ᵉʳ 401/403 (ou l'échec du
      // rafraîchissement) vide la session ; les suivants voient un token vide et sont ignorés
      // → une seule redirection.
      if (!authToken.value) {
        return;
      }

      // Nettoyage direct (état partagé + cookies) pour éviter la dépendance circulaire
      // useAuth → useApi.
      authToken.value = null;
      authTokenCookie.value = null;
      authUser.value = null;
      authUserCookie.value = null;
      authRefreshTokenCookie.value = null;

      if (router.currentRoute.value.path !== LOGIN_PATH) {
        nuxtApp.runWithContext(() =>
          navigateTo({ path: LOGIN_PATH, query: { expired: '1' } }),
        );
      }
    },
  });
}
