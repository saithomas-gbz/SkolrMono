import type { FastifyInstance, FastifyRequest } from 'fastify';
import db from '../../../shared/db';
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
  on: (event: 'close' | 'error' | 'message', listener: (data?: unknown) => void) => void;
  close: (code?: number, reason?: string) => void;
  terminate?: () => void;
};

/**
 * Battement de cœur applicatif. Les proxys coupent une WebSocket inactive
 * (souvent vers 60 s) et la coupure peut être silencieuse des deux côtés : le
 * serveur émet donc un `ping` régulier, auquel le client répond par un `pong`.
 * Sans réponse au bout de deux intervalles, le socket est considéré mort et
 * fermé — ce qui libère la présence et déclenche la reconnexion côté client.
 */
function heartbeatIntervalMs(): number {
  return Number(process.env.MESSAGE_WS_HEARTBEAT_MS) || 25_000;
}

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
    // Un utilisateur déjà connecté ailleurs (autre onglet, autre appareil) est
    // déjà signalé en ligne : ne rediffuser que la première connexion évite un
    // flux de `presence` redondant à chaque ouverture d'onglet.
    const wasOnline = presence.isOnline(userId);
    presence.addConnection(userId, socket);
    if (!wasOnline) await broadcastPresence(userId, true);

    let disconnected = false;
    let awaitingPong = false;

    const heartbeat = setInterval(() => {
      if (socket.readyState !== socket.OPEN) return;
      if (awaitingPong) {
        // Deux pings sans réponse : le socket est à moitié ouvert.
        if (socket.terminate) socket.terminate();
        else socket.close(4002, 'Heartbeat timeout');
        return;
      }
      awaitingPong = true;
      socket.send(JSON.stringify({ type: 'ping' }));
    }, heartbeatIntervalMs());
    // Le battement ne doit pas maintenir le process en vie à lui seul.
    heartbeat.unref?.();

    const handleDisconnect = () => {
      if (disconnected) return;
      disconnected = true;
      clearInterval(heartbeat);
      presence.removeConnection(userId, socket);
      // Ne passer hors ligne qu'à la fermeture du *dernier* socket : sinon
      // fermer un onglet sur deux (ou un simple F5) affiche l'utilisateur
      // hors ligne chez ses interlocuteurs alors qu'il est toujours connecté.
      if (presence.connectionCount(userId) === 0) {
        void broadcastPresence(userId, false);
      }
    };

    socket.on('message', (raw?: unknown) => {
      // Toute trame entrante prouve que le lien est vivant ; on ne parse que
      // pour ignorer proprement un payload malformé.
      awaitingPong = false;
      try {
        const parsed = JSON.parse(String(raw)) as { type?: string };
        if (parsed.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }));
      } catch {
        // Payload client malformé : sans effet, la connexion reste ouverte.
      }
    });
    socket.on('close', handleDisconnect);
    socket.on('error', handleDisconnect);
  },
};
