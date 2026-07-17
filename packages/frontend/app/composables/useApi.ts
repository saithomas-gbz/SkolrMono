import {
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
    onRequest({ options }) {
      const token = authToken.value?.trim();
      if (!token) {
        return;
      }
      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set('Authorization', `Bearer ${token}`);
      options.headers = headers;
    },
    onResponseError({ request, response }) {
      const status = response?.status;
      if (status !== 401 && status !== 403) {
        return;
      }

      // Les endpoints d'auth (login/register) : un 401 y signifie « identifiants incorrects »,
      // géré localement par le formulaire — ne pas déclencher le logout global.
      const url = typeof request === 'string' ? request : request.url;
      if (url.includes('/auth/')) {
        return;
      }

      // Garde anti-doublon : les panels tirent en parallèle. Le 1ᵉʳ 401 vide la session ;
      // les suivants voient un token vide et sont ignorés → une seule redirection.
      if (!authToken.value) {
        return;
      }

      // Nettoyage direct (état partagé + cookies) pour éviter la dépendance circulaire
      // useAuth → useApi.
      authToken.value = null;
      authTokenCookie.value = null;
      authUser.value = null;
      authUserCookie.value = null;

      if (router.currentRoute.value.path !== LOGIN_PATH) {
        nuxtApp.runWithContext(() =>
          navigateTo({ path: LOGIN_PATH, query: { expired: '1' } }),
        );
      }
    },
  });
}
