import Fastify from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyJwt from '@fastify/jwt';
import authRoutes from './routes/authRoutes';
import dotenv from 'dotenv';

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

app.get('/health', async () => {
  return { status: 'ok' };
});

app.listen({ port: 3000, host: '0.0.0.0' }, () => {
  console.log("DATABASE URL", process.env.DATABASE_URL, typeof process.env.DATABASE_URL);
  app.log.info('Server running on http://localhost:3000');
});
