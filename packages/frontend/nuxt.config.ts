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
    },
  },

  modules: ["@primevue/nuxt-module"],
  primevue: {
    options: {
      theme: {
        preset: Aura,
      },
    },
  },
});
