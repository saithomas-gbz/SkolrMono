import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import messageController from '../controllers/messageController';
import db from '../db';
import { publish } from '@skolr/rabbitmq';
import * as presence from '../presence';
import type { FastifyRequest, FastifyReply } from 'fastify';

mock.module('../db', () => ({
  default: {
    conversationParticipant: {
      findUnique: mock(),
      findMany: mock(),
    },
    message: {
      findMany: mock(),
      create: mock(),
    },
  },
}));

mock.module('@skolr/rabbitmq', () => ({
  publish: mock(),
}));

const prismaMock = db as unknown as {
  conversationParticipant: { findUnique: ReturnType<typeof mock>; findMany: ReturnType<typeof mock> };
  message: { findMany: ReturnType<typeof mock>; create: ReturnType<typeof mock> };
};
const publishMock = publish as unknown as ReturnType<typeof mock>;

// `../presence` est partagé avec presence.test.ts dans le même run : on patche
// sendToUser via spyOn (restauré après chaque test) plutôt que mock.module, qui
// remplacerait le module pour tous les fichiers de test du process.
let sendToUserSpy: ReturnType<typeof spyOn>;

function buildRequest(body: { content?: string } = {}, params: { conversationId?: string } = {}) {
  return {
    headers: { authorization: 'Bearer valid-token' },
    server: {
      jwt: { verify: mock(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' })) },
    },
    params: { conversationId: 'conv-1', ...params },
    body,
  } as unknown as FastifyRequest<{ Params: { conversationId: string }; Body: { content: string } }>;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('messageController.sendMessage', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findUnique.mockReset();
    prismaMock.conversationParticipant.findMany.mockReset();
    prismaMock.message.create.mockReset();
    publishMock.mockReset();
    sendToUserSpy = spyOn(presence, 'sendToUser').mockImplementation(() => {});
  });

  afterEach(() => {
    sendToUserSpy.mockRestore();
  });

  it('broadcasts the new message over WS to every other participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({
      id: 'p-1',
      conversationId: 'conv-1',
      userId: 'user-1',
    });
    const message = { id: 'm-1', conversationId: 'conv-1', senderId: 'user-1', content: 'hello', sentAt: new Date() };
    prismaMock.message.create.mockResolvedValue(message);
    prismaMock.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
      { userId: 'user-3' },
    ]);
    publishMock.mockResolvedValue(undefined);

    const request = buildRequest({ content: 'hello' });
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(sendToUserSpy).toHaveBeenCalledTimes(2);
    expect(sendToUserSpy).toHaveBeenCalledWith('user-2', { type: 'message', data: message });
    expect(sendToUserSpy).toHaveBeenCalledWith('user-3', { type: 'message', data: message });
    expect(reply.status).toHaveBeenCalledWith(201);
  });

  it('returns 403 and does not broadcast when the sender is not a participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue(null);
    const request = buildRequest({ content: 'hello' });
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(sendToUserSpy).not.toHaveBeenCalled();
  });
});

describe('messageController.getMessages', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findUnique.mockReset();
    prismaMock.message.findMany.mockReset();
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

    await messageController.getMessages(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 when the requester is not a participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue(null);
    const request = buildRequest();
    const reply = buildReply();

    await messageController.getMessages(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('returns the conversation messages ordered by sentAt ascending', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({
      id: 'p-1',
      conversationId: 'conv-1',
      userId: 'user-1',
    });
    const messages = [
      { id: 'm-1', conversationId: 'conv-1', senderId: 'user-2', content: 'hi', sentAt: new Date('2026-01-01') },
      { id: 'm-2', conversationId: 'conv-1', senderId: 'user-1', content: 'salut', sentAt: new Date('2026-01-02') },
    ];
    prismaMock.message.findMany.mockResolvedValue(messages);

    const request = buildRequest();
    const reply = buildReply();

    await messageController.getMessages(request, reply);

    expect(prismaMock.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      orderBy: { sentAt: 'asc' },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ data: messages });
  });
});
