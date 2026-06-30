import type { FastifyPluginAsync } from 'fastify';
import notificationRoutes from './routes/notificationRoutes';
import { startGradeConsumer } from './consumers/gradeConsumer';
import { startAbsenceConsumer } from './consumers/absenceConsumer';
import { startAbsenceJustificationConsumer } from './consumers/absenceJustificationConsumer';
import { startEnrollmentConsumer } from './consumers/enrollmentConsumer';
import { startMessageConsumer } from './consumers/messageConsumer';
import { startBillingConsumer } from './consumers/billingConsumer';

/**
 * Module Notification — monté sous `/notification`. Expose l'API notifications et
 * abonne les 6 consumers au bus d'événements in-process (grade, absence,
 * justification, inscription, message, billing).
 */
const notificationModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(notificationRoutes);

  await startGradeConsumer();
  await startAbsenceConsumer();
  await startAbsenceJustificationConsumer();
  await startEnrollmentConsumer();
  await startMessageConsumer();
  await startBillingConsumer();
  fastify.log.info('[notification] consumers d\'événements in-process abonnés');
};

export const notificationOpenApiTags = [{ name: 'notification', description: 'Notifications API' }];

export default notificationModule;
