import type { FastifyRequest, FastifyReply } from 'fastify';

interface ClassJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    classUser?: ClassJwtPayload;
  }
}

const STAFF_ROLES = ['TEACHER', 'STAFF', 'ADMIN'];

function verifyToken(request: FastifyRequest): ClassJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as ClassJwtPayload;
  } catch {
    return null;
  }
}

/** Authentifie n'importe quel rôle connu et attache `request.classUser`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  request.classUser = payload;
}

/** Réservé aux enseignants/staff/admin — création/modification de classes et composition élèves/profs. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (!STAFF_ROLES.includes(payload.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.classUser = payload;
}
