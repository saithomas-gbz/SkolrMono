import type { FastifyRequest, FastifyReply } from 'fastify';
import { publish } from '@skolr/rabbitmq';
import db from '../db';
import { getUserId } from './conversationController';
import * as presence from '../presence';

export default {
  getMessages: async (
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: request.params.conversationId,
          userId,
        },
      },
    });
    if (!participant) return reply.status(403).send({ error: 'Forbidden' });

    const messages = await db.message.findMany({
      where: { conversationId: request.params.conversationId },
      orderBy: { sentAt: 'asc' },
    });

    return reply.status(200).send({ data: messages });
  },

  sendMessage: async (
    request: FastifyRequest<{ Params: { conversationId: string }; Body: { content: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: request.params.conversationId,
          userId,
        },
      },
    });
    if (!participant) return reply.status(403).send({ error: 'Forbidden' });

    const message = await db.message.create({
      data: {
        conversationId: request.params.conversationId,
        senderId: userId,
        content: request.body.content,
      },
    });

    const participants = await db.conversationParticipant.findMany({
      where: { conversationId: request.params.conversationId },
      select: { userId: true },
    });
    const recipientIds = participants.map((p) => p.userId).filter((id) => id !== userId);

    await publish('message.received', {
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      recipientIds,
    }).catch((err) => console.error('[message-service] RabbitMQ publish failed:', err));

    for (const recipientId of recipientIds) {
      presence.sendToUser(recipientId, { type: 'message', data: message });
    }

    return reply.status(201).send({ data: message });
  },
};
