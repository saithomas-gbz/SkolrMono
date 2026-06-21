import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import conversationRoutes from './routes/conversationRoutes';
import messageRoutes from './routes/messageRoutes';
import wsRoutes from './routes/wsRoutes';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'message-service',
  tracesSampleRate: 1.0,
});

const port = Number(process.env.PORT || 3010);

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Message Service',
        version: '1.0.0',
        description: 'Message Service API',
      },
      servers: [{ url: `http://localhost:${port}`, description: 'Message Service (direct)' }],
      tags: [{ name: 'message', description: 'Messages API' }],
    },
  });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(fastifyWebsocket);

  await app.register(conversationRoutes);
  await app.register(messageRoutes);
  await app.register(wsRoutes);

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
    app.log.info(`Message service running on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
