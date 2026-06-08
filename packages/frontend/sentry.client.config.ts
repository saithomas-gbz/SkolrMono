import * as Sentry from '@sentry/nuxt';
import { useRuntimeConfig } from '#imports';

const { public: { sentryDsn, sentryEnvironment } } = useRuntimeConfig();

Sentry.init({
  dsn: sentryDsn,
  environment: sentryEnvironment,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});
