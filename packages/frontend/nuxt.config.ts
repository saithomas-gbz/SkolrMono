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
  ],

  css: ['~/assets/css/skolr-prime-overrides.css'],

  i18n: {
    locales: [{ code: 'en', name: 'English', file: 'en.json' }],
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'no_prefix'
  },

  primevue: {
    options: {
      ripple: true
    }
  },

  runtimeConfig: {
    public: {
      authBaseURL: 'http://localhost:3001',
    },
  }
});
