import type { FastifyInstance } from 'fastify';
import wsController from '../controllers/wsController';
import presenceController from '../controllers/presenceController';

export default async function wsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { token?: string } }>('/ws', { websocket: true }, (socket, request) => {
    void wsController.handleConnection(fastify, socket, request);
  });

  fastify.get('/presence', presenceController.getPresence);
}
