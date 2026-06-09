import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import conversationRoutes from './routes/conversationRoutes';
import messageRoutes from './routes/messageRoutes';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'message-service',
  tracesSampleRate: 1.0,
});

const messagePort = Number(process.env.PORT || 3010);

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
      servers: [{ url: `http://localhost:${messagePort}`, description: 'Message Service (direct)' }],
      tags: [
        { name: 'conversation', description: 'Conversation management api' },
        { name: 'message', description: 'Message management api' },
      ],
    },
  });

  await app.register(conversationRoutes);
  await app.register(messageRoutes);

  Sentry.setupFastifyErrorHandler(app);

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  app.get('/health', async () => {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      return { status: 'ok', message: 'Database connection successful!' };
    }
    return { status: 'error', message: 'Database connection failed!' };
  });

  const openApiHandler = async () => app.swagger();

  app.get(
    '/openapi.json',
    {
      schema: {
        hide: true,
        description: 'OpenAPI 3 document (JSON)',
      },
    },
    openApiHandler,
  );

  app.get(
    '/documentation/json',
    {
      schema: {
        hide: true,
        description: 'Same as /openapi.json (@fastify/swagger-ui convention)',
      },
    },
    openApiHandler,
  );

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.ready();
    await app.listen({ port: messagePort, host: '0.0.0.0' });
    app.log.info(`Server running on port ${messagePort}`);
    await testDatabaseConnection();
    app.log.info('Database connection successful!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
