import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './shared/db';
import { modules } from './modules';

dotenv.config();

const PORT = Number(process.env.PORT ?? 3001);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'backend',
  tracesSampleRate: 1.0,
});

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
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

    app.log.info(`Backend running on ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  void start();
}
