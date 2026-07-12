// https://nuxt.com/docs/api/configuration/nuxt-config
import Skolr from "./app/themes/skolr";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  devServer: {
    port: 8000
  },

  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap",
        },
      ],
    },
  },

  runtimeConfig: {
    gatewayInternalUrl:
      process.env.GATEWAY_INTERNAL_URL || "http://localhost:3001",
    public: {
      gatewayBaseUrl: process.env.NUXT_PUBLIC_GATEWAY_BASE_URL || "/api",
      gatewayWsBaseUrl: process.env.NUXT_PUBLIC_GATEWAY_WS_BASE_URL || "ws://localhost:3001",
      gatewayDirectUrl: process.env.NUXT_PUBLIC_GATEWAY_DIRECT_URL || "http://localhost:3001",
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

  nitro: {
    // Bun's node_modules layout creates a symlink cycle between `vue` and
    // `@vue/server-renderer` (mutual peer deps) that Nitro's dependency
    // tracer (node-file-trace) walks into infinitely, crashing the build
    // with ELOOP. We don't need a self-contained standalone bundle here —
    // build and runtime share the same workspace node_modules — so skip
    // the trace/copy step entirely.
    externals: {
      trace: false,
    },
  },

  css: [
    '~/assets/css/tokens.css',
    'primeicons/primeicons.css'
  ],

  primevue: {
    options: {
      theme: {
        preset: Skolr,
        options: {
          darkModeSelector: false,
        },
      },
    },
  },
});
