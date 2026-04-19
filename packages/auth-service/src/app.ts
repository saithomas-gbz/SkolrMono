import Fastify from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyJwt from '@fastify/jwt';
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';
import { testDatabaseConnection } from './db';

dotenv.config();

const app = Fastify({ logger: true });

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
});

app.register(fastifyOauth2, {
  name: 'googleOAuth2',
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID!,
      secret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    auth: fastifyOauth2.GOOGLE_CONFIGURATION
  },
  scope: ['profile', 'email'],
  startRedirectPath: '/login/google',
  callbackUri: process.env.GOOGLE_CALLBACK_URI!,
  callbackUriParams: {
    access_type: 'offline',
  },
  pkce: 'S256'
});

app.register(authRoutes);

app.get('/test-db', async () => {
  const isConnected = await testDatabaseConnection();
  if (isConnected) {
    return { status: 'ok', message: 'Database connection successful!' };
  } else {
    return { status: 'error', message: 'Database connection failed!' };
  }
});

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await app.ready();

    const address = await app.listen({
      port: 3000,
      host: '0.0.0.0'
    });

    await testDatabaseConnection();

    app.log.info(`Server running on ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
