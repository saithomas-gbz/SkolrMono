import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import notificationRoutes from './routes/notificationRoutes';
import { startGradeConsumer } from './consumers/gradeConsumer';
import { startAbsenceConsumer } from './consumers/absenceConsumer';
import { startEnrollmentConsumer } from './consumers/enrollmentConsumer';
import { startMessageConsumer } from './consumers/messageConsumer';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'notification-service',
  tracesSampleRate: 1.0,
});

const port = Number(process.env.PORT || 3009);

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Notification Service',
        version: '1.0.0',
        description: 'Notification Service API',
      },
      servers: [{ url: `http://localhost:${port}`, description: 'Notification Service (direct)' }],
      tags: [{ name: 'notification', description: 'Notifications API' }],
    },
  });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(notificationRoutes);

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
    app.log.info(`Notification service running on port ${port}`);

    await startGradeConsumer();
    await startAbsenceConsumer();
    await startEnrollmentConsumer();
    await startMessageConsumer();
    app.log.info('RabbitMQ consumers started');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
