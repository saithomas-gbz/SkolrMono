import type { FastifyRequest, FastifyReply } from 'fastify';

interface ParentJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    parentUser?: ParentJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): ParentJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as ParentJwtPayload;
  } catch {
    return null;
  }
}

/** Réservé au parent connecté — expose `request.parentUser`. */
export async function requireParent(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (payload.role !== 'PARENT') {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.parentUser = payload;
}

/** Gestion des liens parent ↔ enfant — réservée à l'admin/staff de l'établissement. */
export async function requireAdminOrStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (!['ADMIN', 'STAFF'].includes(payload.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.parentUser = payload;
}

export { verifyToken };
