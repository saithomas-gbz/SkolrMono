import type { FastifyInstance } from 'fastify';
import notificationController from '../controllers/notificationController';

export default async function notificationRoutes(fastify: FastifyInstance) {
  fastify.get('/notifications', notificationController.getNotifications);
  fastify.get('/notifications/unread-count', notificationController.getUnreadCount);
  fastify.patch('/notifications/read-all', notificationController.markAllAsRead);
  fastify.patch('/notifications/:id/read', notificationController.markAsRead);
}
