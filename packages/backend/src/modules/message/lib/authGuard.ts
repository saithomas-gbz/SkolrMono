import type { FastifyRequest, FastifyReply } from 'fastify';
import { deny } from '@/shared/jwt/authGuard';

interface MessageJwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    messageUser?: MessageJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): MessageJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as MessageJwtPayload;
  } catch {
    return null;
  }
}

/** Authentifie n'importe quel rôle connu et attache `request.messageUser`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  request.messageUser = payload;
}
