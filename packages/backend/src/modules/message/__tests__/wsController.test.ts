import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import wsController from '../controllers/wsController';
import db from '../../../shared/db';
import * as presence from '../utils/presence';
import type { FastifyInstance, FastifyRequest } from 'fastify';

mock.module('../../../shared/db', () => ({
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
// `presence` porte un état de module partagé par tous les fichiers de test du
// process (presence.test.ts y enregistre ses propres utilisateurs) : `isOnline`
// et `connectionCount` sont donc neutralisés par défaut, chaque test posant
// ensuite la valeur dont il a besoin.
let connectionCountSpy: ReturnType<typeof spyOn>;
let isOnlineSpy: ReturnType<typeof spyOn>;

function buildFastify(verifyImpl: (token: string) => unknown): FastifyInstance {
  return { jwt: { verify: mock(verifyImpl) } } as unknown as FastifyInstance;
}

function buildSocket() {
  const listeners: Record<string, (data?: unknown) => void> = {};
  return {
    readyState: 1,
    OPEN: 1,
    send: mock(),
    close: mock(),
    terminate: mock(),
    on: mock((event: string, listener: (data?: unknown) => void) => {
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
    isOnlineSpy = spyOn(presence, 'isOnline').mockReturnValue(false);
    connectionCountSpy = spyOn(presence, 'connectionCount').mockReturnValue(0);
  });

  afterEach(() => {
    addConnectionSpy.mockRestore();
    removeConnectionSpy.mockRestore();
    sendToUserSpy.mockRestore();
    connectionCountSpy.mockRestore();
    isOnlineSpy.mockRestore();
    delete process.env.MESSAGE_WS_HEARTBEAT_MS;
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

  it('keeps the user online for peers when one socket of several closes (multi-onglet)', async () => {
    // Régression #243 : fermer un onglet sur deux — ou un simple F5 — affichait
    // l'utilisateur hors ligne chez ses interlocuteurs alors qu'il restait
    // connecté par ailleurs.
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([{ userId: 'peer-1' }]);
    connectionCountSpy.mockReturnValue(1);

    await wsController.handleConnection(fastify, socket, request);
    sendToUserSpy.mockClear();

    socket.listeners.close!();
    await flush();

    expect(removeConnectionSpy).toHaveBeenCalledWith('user-1', socket);
    expect(sendToUserSpy).not.toHaveBeenCalled();
  });

  it('does not re-broadcast online presence for an already connected user', async () => {
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([{ userId: 'peer-1' }]);
    isOnlineSpy.mockReturnValue(true);

    await wsController.handleConnection(fastify, socket, request);

    expect(addConnectionSpy).toHaveBeenCalledWith('user-1', socket);
    expect(sendToUserSpy).not.toHaveBeenCalled();
  });

  it('answers a client ping with a pong', async () => {
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([]);

    await wsController.handleConnection(fastify, socket, request);
    socket.listeners.message!(JSON.stringify({ type: 'ping' }));

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }));
  });

  it('ignores a malformed client frame without closing the socket', async () => {
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([]);

    await wsController.handleConnection(fastify, socket, request);
    socket.listeners.message!('pas du json');

    expect(socket.close).not.toHaveBeenCalled();
    expect(socket.terminate).not.toHaveBeenCalled();
  });

  it('pings periodically and terminates a socket that never answers', async () => {
    process.env.MESSAGE_WS_HEARTBEAT_MS = '5';
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([]);

    await wsController.handleConnection(fastify, socket, request);
    await new Promise((resolve) => setTimeout(resolve, 30));
    socket.listeners.close!();

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
    expect(socket.terminate).toHaveBeenCalled();
  });

  it('keeps a socket alive as long as it answers the heartbeat', async () => {
    process.env.MESSAGE_WS_HEARTBEAT_MS = '5';
    const fastify = buildFastify(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' }));
    const socket = buildSocket();
    const request = buildRequest('good-token');
    prismaMock.conversationParticipant.findMany.mockResolvedValue([]);

    await wsController.handleConnection(fastify, socket, request);
    const answering = setInterval(() => socket.listeners.message!(JSON.stringify({ type: 'pong' })), 2);
    await new Promise((resolve) => setTimeout(resolve, 30));
    clearInterval(answering);
    socket.listeners.close!();

    expect(socket.terminate).not.toHaveBeenCalled();
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
