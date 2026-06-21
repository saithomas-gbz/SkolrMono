import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import wsController from '../controllers/wsController';
import db from '../db';
import * as presence from '../presence';
import type { FastifyInstance, FastifyRequest } from 'fastify';

mock.module('../db', () => ({
  default: {
    conversationParticipant: {
      findMany: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  conversationParticipant: { findMany: ReturnType<typeof mock> };
};

// `../presence` est partagé avec presence.test.ts dans le même run : on patche les
// fonctions via spyOn (restaurées après chaque test) plutôt que mock.module, qui
// remplacerait le module pour tous les fichiers de test du process.
let addConnectionSpy: ReturnType<typeof spyOn>;
let removeConnectionSpy: ReturnType<typeof spyOn>;
let sendToUserSpy: ReturnType<typeof spyOn>;

function buildFastify(verifyImpl: (token: string) => unknown): FastifyInstance {
  return { jwt: { verify: mock(verifyImpl) } } as unknown as FastifyInstance;
}

function buildSocket() {
  const listeners: Record<string, () => void> = {};
  return {
    readyState: 1,
    OPEN: 1,
    send: mock(),
    close: mock(),
    on: mock((event: string, listener: () => void) => {
      listeners[event] = listener;
    }),
    listeners,
  };
}

function buildRequest(token?: string) {
  return { query: { token } } as unknown as FastifyRequest<{ Querystring: { token?: string } }>;
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('wsController.handleConnection', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findMany.mockReset();
    addConnectionSpy = spyOn(presence, 'addConnection').mockImplementation(() => {});
    removeConnectionSpy = spyOn(presence, 'removeConnection').mockImplementation(() => {});
    sendToUserSpy = spyOn(presence, 'sendToUser').mockImplementation(() => {});
  });

  afterEach(() => {
    addConnectionSpy.mockRestore();
    removeConnectionSpy.mockRestore();
    sendToUserSpy.mockRestore();
  });

  it('closes the socket when the token is missing or invalid', async () => {
    const fastify = buildFastify(() => {
      throw new Error('invalid token');
    });
    const socket = buildSocket();
    const request = buildRequest('bad-token');

    await wsController.handleConnection(fastify, socket, request);

    expect(socket.close).toHaveBeenCalledWith(4001, 'Unauthorized');
    expect(addConnectionSpy).not.toHaveBeenCalled();
  });

  it('registers the connection and broadcasts online presence to conversation peers', async () => {
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([{ userId: 'peer-1' }, { userId: 'peer-2' }]);

    await wsController.handleConnection(fastify, socket, request);

    expect(addConnectionSpy).toHaveBeenCalledWith('user-1', socket);
    expect(sendToUserSpy).toHaveBeenCalledWith('peer-1', {
      type: 'presence',
      userId: 'user-1',
      online: true,
    });
    expect(sendToUserSpy).toHaveBeenCalledWith('peer-2', {
      type: 'presence',
      userId: 'user-1',
      online: true,
    });
  });

  it('removes the connection and broadcasts offline presence when the socket closes', async () => {
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([{ userId: 'peer-1' }]);

    await wsController.handleConnection(fastify, socket, request);
    sendToUserSpy.mockClear();

    socket.listeners.close!();
    await flush();

    expect(removeConnectionSpy).toHaveBeenCalledWith('user-1', socket);
    expect(sendToUserSpy).toHaveBeenCalledWith('peer-1', {
      type: 'presence',
      userId: 'user-1',
      online: false,
    });
  });

  it('only broadcasts offline presence once even if both error and close fire', async () => {
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([{ userId: 'peer-1' }]);

    await wsController.handleConnection(fastify, socket, request);
    sendToUserSpy.mockClear();
    removeConnectionSpy.mockClear();

    socket.listeners.error!();
    socket.listeners.close!();
    await flush();

    expect(removeConnectionSpy).toHaveBeenCalledTimes(1);
    expect(sendToUserSpy).toHaveBeenCalledTimes(1);
  });
});
