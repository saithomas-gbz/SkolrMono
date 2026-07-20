import type { FastifyInstance } from 'fastify';
import notificationController from '../controllers/notificationController';
import { requireAuth } from '../lib/authGuard';

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/notifications', { preHandler: requireAuth }, notificationController.getNotifications);
  fastify.get(
    '/notifications/unread-count',
    { preHandler: requireAuth },
    notificationController.getUnreadCount,
  );
  fastify.patch(
    '/notifications/read-all',
    { preHandler: requireAuth },
    notificationController.markAllAsRead,
  );
  fastify.patch('/notifications/:id/read', { preHandler: requireAuth }, notificationController.markAsRead);
}
