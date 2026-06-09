import type { FastifyInstance } from 'fastify';
import conversationController from '../controllers/conversationController';

export default async function conversationRoutes(fastify: FastifyInstance) {
  fastify.post('/conversations', conversationController.createConversation);
  fastify.get('/conversations/:id', conversationController.getConversationById);
  fastify.get('/conversations/user/:userId', conversationController.getConversationsByUserId);
}
