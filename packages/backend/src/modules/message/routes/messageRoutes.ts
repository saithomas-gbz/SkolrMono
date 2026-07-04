import fastifyMultipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import messageController from '../controllers/messageController';

export default async function messageRoutes(fastify: FastifyInstance) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: Number(process.env.MESSAGE_MAX_FILE_SIZE_BYTES) || 5_242_880,
      files: 5,
    },
  });

  fastify.get('/conversations/:conversationId/messages', messageController.getMessages);
  fastify.post('/conversations/:conversationId/messages', messageController.sendMessage);
  fastify.get(
    '/conversations/:conversationId/attachments/:attachmentId',
    messageController.downloadAttachment,
  );
}
