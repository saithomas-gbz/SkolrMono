import * as Sentry from '@sentry/node';
import Fastify from 'fastify';
import dotenv from 'dotenv';
import { getChannel } from '@skolr/rabbitmq';
import { startAbsenceConsumer } from './consumers/absenceConsumer.js';
import { startGradeConsumer } from './consumers/gradeConsumer.js';
import { startStudentEnrolledConsumer } from './consumers/studentEnrolledConsumer.js';
import { startMessageConsumer } from './consumers/messageConsumer.js';

dotenv.config();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  serverName: 'notification-service',
  tracesSampleRate: 1.0,
});

const port = Number(process.env.PORT || 3009);

async function start() {
  const app = Fastify({ logger: true });

  Sentry.setupFastifyErrorHandler(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Notification service running on port ${port}`);

  await getChannel();
  await Promise.all([
    startAbsenceConsumer(),
    startGradeConsumer(),
    startStudentEnrolledConsumer(),
    startMessageConsumer(),
  ]);

  app.log.info('All RabbitMQ consumers started');
}

void start();
