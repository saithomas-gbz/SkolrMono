import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './db';
import { authTag } from './schemas/authOpenApi';
import userRoutes from './routes/userRoutes';
import invitationRoutes from './routes/invitationRoutes';
import { invitationTag } from './schemas/invitationOpenApi';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'auth-service',
  tracesSampleRate: 1.0,
});

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Skolr Auth Service',
        version: '1.0.0',
        description: 'Authentication API (OpenAPI source for gateway merge)',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Auth service (direct)' }],
      tags: [
        { name: authTag, description: 'Authentication' },
        { name: invitationTag, description: 'User invitations' },
      ],
    },
  });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
  });

  await app.register(fastifyOauth2, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    scope: ['profile', 'email'],
    startRedirectPath: '/login/google',
    callbackUri: process.env.GOOGLE_CALLBACK_URI!,
    callbackUriParams: {
      access_type: 'offline',
    },
    pkce: 'S256',
  });

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(invitationRoutes);

  Sentry.setupFastifyErrorHandler(app);

  app.get('/test-db', async () => {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      return { status: 'ok', message: 'Database connection successful!' };
    }
    return { status: 'error', message: 'Database connection failed!' };
  });

  app.get('/health', async () => {
    return { status: 'ok' };
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

const start = async () => {
  try {
    const app = await buildApp();

    await app.ready();

    const address = await app.listen({
      port: 3000,
      host: '0.0.0.0',
    });

    await testDatabaseConnection();

    app.log.info(`Server running on ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

void start();
