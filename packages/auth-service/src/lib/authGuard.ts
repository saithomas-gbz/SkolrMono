import type { FastifyRequest, FastifyReply } from 'fastify';

interface AuthJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): AuthJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as AuthJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Invitations réservées à l'ADMIN de son propre établissement — jamais au PLATFORM_ADMIN,
 * qui n'appartient à aucun établissement et ne doit pas créer de comptes à la place d'un client.
 */
export async function requireEstablishmentAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (payload.role !== 'ADMIN' || !payload.establishmentId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.authUser = payload;
}
