import { useAuthTokenCookie } from '~/composables/authSession';

export function useApi() {
  const config = useRuntimeConfig();
  const authTokenCookie = useAuthTokenCookie();

  return $fetch.create({
    baseURL: config.public.gatewayBaseUrl,
    credentials: 'include',
    onRequest({ options }) {
      const token = authTokenCookie.value?.trim();
      if (!token) {
        return;
      }
      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set('Authorization', `Bearer ${token}`);
      options.headers = headers;
    },
  });
}

