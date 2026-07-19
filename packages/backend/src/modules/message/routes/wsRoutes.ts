import type { FastifyInstance } from 'fastify';
import wsController from '../controllers/wsController';
import presenceController from '../controllers/presenceController';
import { requireAuth } from '../lib/authGuard';

export default async function wsRoutes(fastify: FastifyInstance) {
  // Le handshake WebSocket ne permet pas d'en-tête Authorization côté navigateur :
  // le token est passé en query string et vérifié directement dans le contrôleur
  // (mécanisme distinct de requireAuth, volontairement conservé).
  fastify.get<{ Querystring: { token?: string } }>('/ws', { websocket: true }, (socket, request) => {
    void wsController.handleConnection(fastify, socket, request);
  });

  fastify.get('/presence', { preHandler: requireAuth }, presenceController.getPresence);
}
