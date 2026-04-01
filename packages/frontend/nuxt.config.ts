// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/hints',
    '@nuxtjs/i18n',
    '@primevue/nuxt-module',
    'nuxt-auth-utils'
  ],

  runtimeConfig: {
    public: {
      auth: {
        baseURL: 'http://localhost:3000',
        redirect: {
          login: '/login',
          logout: '/',
          callback: '/auth/callback',
          home: '/'
        }
      }
    }
  }
})
