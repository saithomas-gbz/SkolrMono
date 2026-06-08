import * as Sentry from '@sentry/nuxt';

Sentry.init({
  dsn: process.env.NUXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'frontend',
  tracesSampleRate: 1.0,
});
