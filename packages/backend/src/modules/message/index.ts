import type { FastifyPluginAsync } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import conversationRoutes from './routes/conversationRoutes';
import messageRoutes from './routes/messageRoutes';
import wsRoutes from './routes/wsRoutes';

/**
 * Module Message — monté sous `/message`. Conversations, messages (pièces jointes
 * locales/S3), accusés de lecture et temps réel via WebSocket (`/message/ws`).
 */
const messageModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyWebsocket);
  await fastify.register(conversationRoutes);
  await fastify.register(messageRoutes);
  await fastify.register(wsRoutes);
};

export const messageOpenApiTags = [{ name: 'message', description: 'Messages API' }];

export default messageModule;
