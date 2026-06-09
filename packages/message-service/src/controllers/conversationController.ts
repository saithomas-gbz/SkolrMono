import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

export interface CreateConversationBody {
  name?: string;
  participantIds: string[];
}

export default {
  createConversation: async (
    request: FastifyRequest<{ Body: CreateConversationBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { name, participantIds } = request.body;

      const conversation = await db.conversation.create({
        data: {
          name: name ?? null,
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
        },
        include: {
          participants: true,
          messages: true,
        },
      });

      return reply.status(201).send({ data: conversation, message: 'Conversation created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getConversationById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;

      const conversation = await db.conversation.findUnique({
        where: { id },
        include: {
          participants: true,
          messages: true,
        },
      });

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      return reply.status(200).send({ data: conversation, message: 'Conversation fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getConversationsByUserId: async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = request.params;

      const conversations = await db.conversation.findMany({
        where: {
          participants: {
            some: { userId },
          },
        },
        include: {
          participants: true,
          messages: true,
        },
      });

      return reply.status(200).send({ data: conversations, message: 'Conversations fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
