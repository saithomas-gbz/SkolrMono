import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import * as presence from '../utils/presence';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

function getUserId(request: FastifyRequest): string | null {
  try {
    const payload = request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as JwtPayload;
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export default {
  createConversation: async (
    request: FastifyRequest<{ Body: { name?: string; participantIds: string[] } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { name, participantIds } = request.body;
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    const conversation = await db.conversation.create({
      data: {
        name,
        participants: {
          create: allParticipantIds.map((uid) => ({ userId: uid })),
        },
      },
      include: {
        participants: true,
        messages: true,
      },
    });

    return reply.status(201).send({ data: conversation });
  },

  getConversationsByUser: async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const participations = await db.conversationParticipant.findMany({
      where: { userId: request.params.userId },
      include: {
        conversation: {
          include: {
            participants: true,
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const conversations = await Promise.all(
      participations.map(async (p) => {
        const unreadCount = await db.message.count({
          where: {
            conversationId: p.conversation.id,
            senderId: { not: request.params.userId },
            reads: { none: { userId: request.params.userId } },
          },
        });
        return { ...p.conversation, unreadCount };
      }),
    );

    return reply.status(200).send({ data: conversations });
  },

  markConversationAsRead: async (
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

    const unreadMessages = await db.message.findMany({
      where: {
        conversationId: request.params.conversationId,
        senderId: { not: userId },
        reads: { none: { userId } },
      },
      select: { id: true, senderId: true },
    });

    if (unreadMessages.length === 0) {
      return reply.status(200).send({ data: { messageIds: [] } });
    }

    const readAt = new Date();
    await db.messageRead.createMany({
      data: unreadMessages.map((m) => ({ messageId: m.id, userId, readAt })),
      skipDuplicates: true,
    });

    const messageIds = unreadMessages.map((m) => m.id);
    const senderIds = [...new Set(unreadMessages.map((m) => m.senderId))];
    for (const senderId of senderIds) {
      presence.sendToUser(senderId, {
        type: 'read',
        conversationId: request.params.conversationId,
        messageIds,
        readerId: userId,
        readAt,
      });
    }

    return reply.status(200).send({ data: { messageIds } });
  },

  getConversationById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const conversation = await db.conversation.findUnique({
      where: { id: request.params.id },
      include: {
        participants: true,
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!conversation) return reply.status(404).send({ error: 'Conversation not found' });

    const isMember = conversation.participants.some((p) => p.userId === userId);
    if (!isMember) return reply.status(403).send({ error: 'Forbidden' });

    return reply.status(200).send({ data: conversation });
  },
};

export { getUserId };
