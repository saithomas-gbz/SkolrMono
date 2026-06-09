import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { publish, ROUTING_KEYS } from '@skolr/rabbitmq';

export interface CreateMessageBody {
  senderId: string;
  content: string;
}

export default {
  getMessagesByConversation: async (
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { conversationId } = request.params;

      const messages = await db.message.findMany({
        where: { conversationId },
      });

      return reply.status(200).send({ data: messages, message: 'Messages fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  createMessage: async (
    request: FastifyRequest<{ Params: { conversationId: string }; Body: CreateMessageBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { conversationId } = request.params;
      const { senderId, content } = request.body;

      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      });

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some((p) => p.userId === senderId);
      if (!isParticipant) {
        return reply.status(403).send({ error: 'Sender is not a participant of this conversation' });
      }

      const message = await db.message.create({
        data: {
          conversationId,
          senderId,
          content,
        },
      });

      void publish(ROUTING_KEYS.MESSAGE_RECEIVED, {
        messageId: message.id,
        conversationId,
        senderId,
        recipientIds: conversation.participants.map((p) => p.userId).filter((id) => id !== senderId),
        content,
        sentAt: message.sentAt.toISOString(),
      });

      return reply.status(201).send({ data: message, message: 'Message created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
