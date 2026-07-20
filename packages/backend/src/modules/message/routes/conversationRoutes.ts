import type { FastifyInstance } from 'fastify';
import conversationController from '../controllers/conversationController';
import { requireAuth } from '../lib/authGuard';

export default async function conversationRoutes(fastify: FastifyInstance) {
  fastify.post('/conversations', { preHandler: requireAuth }, conversationController.createConversation);
  fastify.get(
    '/conversations/user/:userId',
    { preHandler: requireAuth },
    conversationController.getConversationsByUser,
  );
  fastify.get('/conversations/:id', { preHandler: requireAuth }, conversationController.getConversationById);
  fastify.patch(
    '/conversations/:conversationId/read',
    { preHandler: requireAuth },
    conversationController.markConversationAsRead,
  );
}
