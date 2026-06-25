import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import conversationController from '../controllers/conversationController';
import db from '../db';
import * as presence from '../utils/presence';
import type { FastifyRequest, FastifyReply } from 'fastify';

mock.module('../db', () => ({
  default: {
    conversationParticipant: {
      findUnique: mock(),
      findMany: mock(),
    },
    message: {
      findMany: mock(),
      count: mock(),
    },
    messageRead: {
      createMany: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  conversationParticipant: { findUnique: ReturnType<typeof mock>; findMany: ReturnType<typeof mock> };
  message: { findMany: ReturnType<typeof mock>; count: ReturnType<typeof mock> };
  messageRead: { createMany: ReturnType<typeof mock> };
};

let sendToUserSpy: ReturnType<typeof spyOn>;

function buildRequest(params: { conversationId?: string; userId?: string } = {}) {
  return {
    headers: { authorization: 'Bearer valid-token' },
    server: {
      jwt: { verify: mock(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' })) },
    },
    params: { conversationId: 'conv-1', ...params },
  } as unknown as FastifyRequest<{ Params: { conversationId: string; userId: string } }>;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('conversationController.markConversationAsRead', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findUnique.mockReset();
    prismaMock.message.findMany.mockReset();
    prismaMock.messageRead.createMany.mockReset();
    sendToUserSpy = spyOn(presence, 'sendToUser').mockImplementation(() => {});
  });

  afterEach(() => {
    sendToUserSpy.mockRestore();
  });

  it('returns 401 when unauthenticated', async () => {
    const request = {
      headers: { authorization: '' },
      server: {
        jwt: {
          verify: mock(() => {
            throw new Error('invalid token');
          }),
        },
      },
      params: { conversationId: 'conv-1' },
    } as unknown as FastifyRequest<{ Params: { conversationId: string } }>;
    const reply = buildReply();

    await conversationController.markConversationAsRead(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 when the requester is not a participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue(null);
    const request = buildRequest();
    const reply = buildReply();

    await conversationController.markConversationAsRead(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('marks unread messages from other participants as read and broadcasts to each distinct sender', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({
      id: 'p-1',
      conversationId: 'conv-1',
      userId: 'user-1',
    });
    prismaMock.message.findMany.mockResolvedValue([
      { id: 'm-1', senderId: 'user-2' },
      { id: 'm-2', senderId: 'user-2' },
      { id: 'm-3', senderId: 'user-3' },
    ]);
    prismaMock.messageRead.createMany.mockResolvedValue({ count: 3 });

    const request = buildRequest();
    const reply = buildReply();

    await conversationController.markConversationAsRead(request, reply);

    expect(prismaMock.message.findMany).toHaveBeenCalledWith({
      where: {
        conversationId: 'conv-1',
        senderId: { not: 'user-1' },
        reads: { none: { userId: 'user-1' } },
      },
      select: { id: true, senderId: true },
    });
    expect(prismaMock.messageRead.createMany).toHaveBeenCalledWith({
      data: [
        { messageId: 'm-1', userId: 'user-1', readAt: expect.any(Date) },
        { messageId: 'm-2', userId: 'user-1', readAt: expect.any(Date) },
        { messageId: 'm-3', userId: 'user-1', readAt: expect.any(Date) },
      ],
      skipDuplicates: true,
    });
    expect(sendToUserSpy).toHaveBeenCalledTimes(2);
    expect(sendToUserSpy).toHaveBeenCalledWith('user-2', {
      type: 'read',
      conversationId: 'conv-1',
      messageIds: ['m-1', 'm-2', 'm-3'],
      readerId: 'user-1',
      readAt: expect.any(Date),
    });
    expect(sendToUserSpy).toHaveBeenCalledWith('user-3', {
      type: 'read',
      conversationId: 'conv-1',
      messageIds: ['m-1', 'm-2', 'm-3'],
      readerId: 'user-1',
      readAt: expect.any(Date),
    });
    expect(reply.status).toHaveBeenCalledWith(200);
  });

  it('is a no-op and broadcasts nothing when everything is already read', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({
      id: 'p-1',
      conversationId: 'conv-1',
      userId: 'user-1',
    });
    prismaMock.message.findMany.mockResolvedValue([]);

    const request = buildRequest();
    const reply = buildReply();

    await conversationController.markConversationAsRead(request, reply);

    expect(prismaMock.messageRead.createMany).not.toHaveBeenCalled();
    expect(sendToUserSpy).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ data: { messageIds: [] } });
  });
});

describe('conversationController.getConversationsByUser', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findMany.mockReset();
    prismaMock.message.count.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    const request = {
      headers: { authorization: '' },
      server: {
        jwt: {
          verify: mock(() => {
            throw new Error('invalid token');
          }),
        },
      },
      params: { userId: 'user-1' },
    } as unknown as FastifyRequest<{ Params: { userId: string } }>;
    const reply = buildReply();

    await conversationController.getConversationsByUser(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(prismaMock.conversationParticipant.findMany).not.toHaveBeenCalled();
  });

  it('attaches the unread message count, excluding the user own messages, to each conversation', async () => {
    prismaMock.conversationParticipant.findMany.mockResolvedValue([
      { conversation: { id: 'conv-1', participants: [], messages: [] } },
      { conversation: { id: 'conv-2', participants: [], messages: [] } },
    ]);
    prismaMock.message.count.mockImplementation(async ({ where }: { where: { conversationId: string } }) =>
      where.conversationId === 'conv-1' ? 3 : 0,
    );

    const request = buildRequest({ userId: 'user-1' });
    const reply = buildReply();

    await conversationController.getConversationsByUser(request, reply);

    expect(prismaMock.message.count).toHaveBeenCalledWith({
      where: {
        conversationId: 'conv-1',
        senderId: { not: 'user-1' },
        reads: { none: { userId: 'user-1' } },
      },
    });
    expect(reply.send).toHaveBeenCalledWith({
      data: [
        { id: 'conv-1', participants: [], messages: [], unreadCount: 3 },
        { id: 'conv-2', participants: [], messages: [], unreadCount: 0 },
      ],
    });
  });
});
