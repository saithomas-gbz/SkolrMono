import fastifyMultipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import messageController from '../controllers/messageController';
import { requireAuth } from '../lib/authGuard';

export default async function messageRoutes(fastify: FastifyInstance) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: Number(process.env.MESSAGE_MAX_FILE_SIZE_BYTES) || 5_242_880,
      files: 5,
    },
  });

  fastify.get(
    '/conversations/:conversationId/messages',
    { preHandler: requireAuth },
    messageController.getMessages,
  );
  fastify.post(
    '/conversations/:conversationId/messages',
    { preHandler: requireAuth },
    messageController.sendMessage,
  );
  fastify.get(
    '/conversations/:conversationId/attachments/:attachmentId',
    { preHandler: requireAuth },
    messageController.downloadAttachment,
  );
}
