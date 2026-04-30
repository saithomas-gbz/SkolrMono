import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import classRoutes from './routes/classRoutes';

dotenv.config();


async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Class Service',
        version: '1.0.0',
        description: 'Class Service API',
      },
      servers: [{ url: 'http://localhost:3002', description: 'Class Service (direct)' }],
      tags: [{ name: 'class', description: 'Class services api' }],
    },
  });

  await app.register(classRoutes);

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  app.get('/health', async () => ({ status: 'ok' }));

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
    await app.listen({ port: 3002, host: '0.0.0.0' });
    app.log.info(`Server running on port 3002`);
    await testDatabaseConnection();
    app.log.info(`Database connection successful!`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();