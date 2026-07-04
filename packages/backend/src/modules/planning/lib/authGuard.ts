import type { FastifyRequest, FastifyReply } from 'fastify';

interface PlanningJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    planningUser?: PlanningJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): PlanningJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as PlanningJwtPayload;
  } catch {
    return null;
  }
}

/** Authentifie n'importe quel rôle connu et attache `request.planningUser`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  request.planningUser = payload;
}

/** Réservé aux enseignants/staff/admin — file de validation des justifications. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (!['TEACHER', 'STAFF', 'ADMIN'].includes(payload.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.planningUser = payload;
}
