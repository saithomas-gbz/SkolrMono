import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import parentRoutes from './routes/parentRoutes';
import parentLinkRoutes from './routes/parentLinkRoutes';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'parent-service',
  tracesSampleRate: 1.0,
});

const port = Number(process.env.PORT || 3012);

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Parent Service',
        version: '1.0.0',
        description: 'Parent Service API — liaison parent ↔ enfant',
      },
      servers: [{ url: `http://localhost:${port}`, description: 'Parent Service (direct)' }],
      tags: [{ name: 'parent', description: 'Parent API' }],
    },
  });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(parentRoutes);
  await app.register(parentLinkRoutes);

  Sentry.setupFastifyErrorHandler(app);

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  app.get('/health', async () => {
    const isConnected = await testDatabaseConnection();
    return isConnected
      ? { status: 'ok', message: 'Database connection successful!' }
      : { status: 'error', message: 'Database connection failed!' };
  });

  const openApiHandler = async () => app.swagger();
  app.get('/openapi.json', { schema: { hide: true } }, openApiHandler);
  app.get('/documentation/json', { schema: { hide: true } }, openApiHandler);

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.ready();
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Parent service running on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
