// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from "@primeuix/themes/aura";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  devServer: {
    port: 8000
  },

  runtimeConfig: {
    gatewayInternalUrl:
      process.env.GATEWAY_INTERNAL_URL || "http://localhost:3001",
    public: {
      gatewayBaseUrl: process.env.NUXT_PUBLIC_GATEWAY_BASE_URL || "/api",
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
      sentryEnvironment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT || "development",
    },
  },

  modules: ["@primevue/nuxt-module", "@sentry/nuxt/module", "@nuxtjs/i18n"],

  i18n: {
    defaultLocale: "fr",
    locales: [{ code: "fr", file: "fr.yaml", language: "fr-FR" }],
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: process.env.SENTRY_ORG || "",
      project: process.env.SENTRY_PROJECT || "frontend",
      authToken: process.env.SENTRY_AUTH_TOKEN || "",
    },
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
      },
    },
  },
});
