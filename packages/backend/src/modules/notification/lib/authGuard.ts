import type { FastifyRequest, FastifyReply } from 'fastify';
import { deny } from '@/shared/jwt/authGuard';

interface NotificationJwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    notificationUser?: NotificationJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): NotificationJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as NotificationJwtPayload;
  } catch {
    return null;
  }
}

/** Authentifie n'importe quel rôle connu et attache `request.notificationUser`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  request.notificationUser = payload;
}
