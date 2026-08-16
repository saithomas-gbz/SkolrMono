import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './shared/db';
import { collectHttpMetrics, startMetricsServer } from './shared/metrics';
import { modules } from './modules';

dotenv.config();

const PORT = Number(process.env.PORT ?? 3001);

/**
 * Origines autorisées pour le CORS (allowlist). Par défaut, les origines de dev
 * du frontend ; surchargeables en prod via `CORS_ORIGINS` (liste séparée par des
 * virgules). Remplace l'ancien `origin: true` qui reflétait n'importe quelle origine.
 */
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? 'http://localhost:3003,http://localhost:8000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'backend',
  tracesSampleRate: 1.0,
});

// Derrière un reverse proxy (nginx, load balancer…), le socket ne voit que
// l'IP du proxy : sans trustProxy, tout le trafic partage cette même IP côté
// rate-limiting (contourne totalement la limite par IP, cf. docs/security/audit.md
// R1). `TRUST_PROXY=true` fait lire `request.ip` depuis `X-Forwarded-For` — à
// n'activer que si un proxy de confiance est effectivement en amont (sinon un
// client peut usurper son IP apparente via ce même en-tête). Faux par défaut :
// sûr par défaut, à activer explicitement en production derrière un proxy.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: TRUST_PROXY });

  // Posé sur l'instance racine avant l'enregistrement des modules : le hook
  // couvre ainsi toutes les routes montées ensuite (#218).
  collectHttpMetrics(app);

  // En-têtes de sécurité (helmet) : HSTS, X-Content-Type-Options, frameguard, CSP…
  // La CSP autorise l'inline nécessaire à Swagger UI (`/docs`) tout en verrouillant
  // le reste sur `'self'`.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
      },
    },
  });

  // CORS restreint à une allowlist (plus de reflet d'origine arbitraire).
  await app.register(fastifyCors, {
    origin: CORS_ORIGINS,
    credentials: true,
  });

  // Rate-limiting global (anti-abus / anti-DoS applicatif). Les routes d'auth
  // sensibles resserrent la limite via `config.rateLimit` sur chaque route.
  await app.register(fastifyRateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Backend',
        version: '1.0.0',
        description: 'Monolithe modulaire Skolr (auth, class, grade, planning, message, notification, billing, parent).',
      },
      servers: [{ url: `http://localhost:${PORT}`, description: 'Backend' }],
      tags: modules.flatMap((m) => m.openApiTags ?? []),
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
  });

  // Montage de chaque module sous son préfixe (contrat d'API conservé).
  for (const mod of modules) {
    await app.register(mod.plugin, { prefix: mod.prefix });
  }

  Sentry.setupFastifyErrorHandler(app);

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  const openApiHandler = async () => app.swagger();

  app.get('/openapi.json', { schema: { hide: true } }, openApiHandler);
  app.get('/documentation/json', { schema: { hide: true } }, openApiHandler);

  return app;
}

const start = async () => {
  try {
    const app = await buildApp();

    await app.ready();

    const address = await app.listen({
      port: PORT,
      host: '0.0.0.0',
    });

    await testDatabaseConnection();

    const metricsAddress = await startMetricsServer();
    if (metricsAddress) {
      app.log.info(`Metrics exposed on ${metricsAddress}/metrics`);
    }

    app.log.info(`Backend running on ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  void start();
}
