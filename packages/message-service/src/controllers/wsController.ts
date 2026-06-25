import type { FastifyInstance, FastifyRequest } from 'fastify';
import db from '../db';
import * as presence from '../utils/presence';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

type WsConnection = {
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
  on: (event: 'close' | 'error', listener: () => void) => void;
  close: (code?: number, reason?: string) => void;
};

async function broadcastPresence(userId: string, online: boolean): Promise<void> {
  const peers = await db.conversationParticipant.findMany({
    where: {
      conversation: { participants: { some: { userId } } },
      userId: { not: userId },
    },
    select: { userId: true },
    distinct: ['userId'],
  });
  const payload = { type: 'presence', userId, online };
  for (const peer of peers) {
    presence.sendToUser(peer.userId, payload);
  }
}

export default {
  handleConnection: async (
    fastify: FastifyInstance,
    socket: WsConnection,
    request: FastifyRequest<{ Querystring: { token?: string } }>,
  ) => {
    let payload: JwtPayload;
    try {
      payload = fastify.jwt.verify(request.query.token ?? '') as JwtPayload;
    } catch {
      socket.close(4001, 'Unauthorized');
      return;
    }

    const userId = payload.userId;
    presence.addConnection(userId, socket);
    await broadcastPresence(userId, true);

    let disconnected = false;
    const handleDisconnect = () => {
      if (disconnected) return;
      disconnected = true;
      presence.removeConnection(userId, socket);
      void broadcastPresence(userId, false);
    };

    socket.on('close', handleDisconnect);
    socket.on('error', handleDisconnect);
  },
};
