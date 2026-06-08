import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import gradeRoutes from './routes/gradeRoutes';
import courseRoutes from './routes/courseRoutes';
import subjectRoutes from './routes/subjectRoutes';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'grade-service',
  tracesSampleRate: 1.0,
});

const gradePort = Number(process.env.PORT || 3007);

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Grade Service',
        version: '1.0.0',
        description: 'Grade Service API',
      },
      servers: [{ url: `http://localhost:${gradePort}`, description: 'Grade Service (direct)' }],
      tags: [
        { name: 'grade', description: 'Grade services api' },
        { name: 'course', description: 'Course management api' },
        { name: 'subject', description: 'Subject management api' },
      ],
    },
  });

  await app.register(gradeRoutes);
  await app.register(courseRoutes);
  await app.register(subjectRoutes);

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
    await app.listen({ port: gradePort, host: '0.0.0.0' });
    app.log.info(`Server running on port ${gradePort}`);
    await testDatabaseConnection();
    app.log.info('Database connection successful!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
