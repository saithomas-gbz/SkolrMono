import { FastifyInstance, FastifyRequest } from 'fastify';
import proxyPlugin from '../plugins/proxy';

export type WsConnection = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  on: (event: 'message' | 'close' | 'error', listener: (...args: unknown[]) => void) => void;
};

/**
 * Relaie une connexion WS cliente vers `message-service` (gateway -> message-service),
 * dans les deux sens. Les messages reçus avant l'ouverture de la connexion amont sont
 * mis en file puis envoyés une fois celle-ci prête.
 */
export function relayMessageWs(messageServiceWsUrl: string, socket: WsConnection, request: FastifyRequest) {
  const token = (request.query as { token?: string } | undefined)?.token;
  const target = new URL('/ws', messageServiceWsUrl);
  if (token) target.searchParams.set('token', token);

  const upstream = new WebSocket(target);
  const pending: string[] = [];

  upstream.addEventListener('open', () => {
    for (const message of pending.splice(0)) upstream.send(message);
  });
  upstream.addEventListener('message', (event) => {
    socket.send(event.data as string);
  });
  upstream.addEventListener('close', () => socket.close());
  upstream.addEventListener('error', () => socket.close());

  socket.on('message', (data) => {
    const text = (data as Buffer).toString();
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(text);
    } else {
      pending.push(text);
    }
  });
  socket.on('close', () => upstream.close());
  socket.on('error', () => upstream.close());

  return upstream;
}

export default async function messageRoutes(fastify: FastifyInstance) {
  await proxyPlugin(fastify);

  const messageServiceUrl = process.env.MESSAGE_SERVICE_URL || 'http://message-service:3010';
  const messageServiceWsUrl = messageServiceUrl.replace(/^http/, 'ws');

  // Relais WS dédié (le catch-all HTTP ci-dessous ne gère pas les upgrades).
  fastify.get(
    '/message/ws',
    { websocket: true, schema: { hide: true } },
    (socket: WsConnection, request) => {
      relayMessageWs(messageServiceWsUrl, socket, request);
    },
  );

  // Envoi multipart (pièces jointes) : body transmis tel quel à message-service.
  // Contexte scoped pour ne pas interférer avec le parsing JSON des autres routes.
  await fastify.register(async (scoped) => {
    scoped.addContentTypeParser('multipart/form-data', { parseAs: 'buffer' }, (_request, body, done) => {
      done(null, body);
    });
    scoped.post(
      '/message/conversations/:conversationId/messages',
      { schema: { hide: true } },
      async (request, reply) => {
        await fastify.proxyToMessageService(request, reply);
      },
    );
  });

  fastify.all(
    '/message/*',
    {
      schema: {
        hide: true,
        description: 'Catch-all proxy to message-service.',
      },
    },
    async (request, reply) => {
      await fastify.proxyToMessageService(request, reply);
    },
  );
}
