import type { FastifyInstance } from 'fastify';
import messageController from '../controllers/messageController';

export default async function messageRoutes(fastify: FastifyInstance) {
  fastify.get('/conversations/:conversationId/messages', messageController.getMessagesByConversation);
  fastify.post('/conversations/:conversationId/messages', messageController.createMessage);
}
