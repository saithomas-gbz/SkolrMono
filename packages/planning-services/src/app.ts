import Fastify from 'fastify';
import dotenv from 'dotenv';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { testDatabaseConnection } from './db';
import sessionRoutes from './routes/sessionRoutes';
import absenceRoutes from './routes/absenceRoutes';

dotenv.config();

const planningPort = Number(process.env.PORT || 3008);

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Planning Service',
        version: '1.0.0',
        description: 'Planning Service API',
      },
      servers: [{ url: `http://localhost:${planningPort}`, description: 'Planning Service (direct)' }],
      tags: [
        { name: 'session', description: 'Session scheduling api' },
        { name: 'absence', description: 'Absence management api' },
      ],
    },
  });

  await app.register(sessionRoutes);
  await app.register(absenceRoutes);

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

  app.get('/openapi.json', { schema: { hide: true } }, openApiHandler);
  app.get('/documentation/json', { schema: { hide: true } }, openApiHandler);

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.ready();
    await app.listen({ port: planningPort, host: '0.0.0.0' });
    app.log.info(`Server running on port ${planningPort}`);
    await testDatabaseConnection();
    app.log.info('Database connection successful!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

void start();
