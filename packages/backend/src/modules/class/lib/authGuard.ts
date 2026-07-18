import type { FastifyRequest, FastifyReply } from 'fastify';
import { deny } from '../../../shared/jwt/authGuard';

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
    return deny(reply, 401, 'Unauthorized');
  }
  request.classUser = payload;
}

/** Réservé aux enseignants/staff/admin — création/modification de classes et composition élèves/profs. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (!STAFF_ROLES.includes(payload.role)) {
    return deny(reply, 403, 'Forbidden');
  }
  request.classUser = payload;
}
