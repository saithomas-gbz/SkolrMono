import type { FastifyRequest, FastifyReply } from 'fastify';
import { deny } from '../../../shared/jwt/authGuard';

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
    return deny(reply, 401, 'Unauthorized');
  }
  request.planningUser = payload;
}

/**
 * Réservé à l'administration — enseignants exclus.
 *
 * Poser une séance écrit dans l'emploi du temps de l'établissement, pas
 * seulement dans le cours de celui qui la crée : c'est une décision
 * d'organisation. Les enseignants gardent la modification et la suppression de
 * leurs propres séances, toujours gardées par `requireStaff` et bornées à leur
 * périmètre de classes.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (payload.role !== 'ADMIN') {
    return deny(reply, 403, 'Forbidden');
  }
  request.planningUser = payload;
}

/** Réservé aux enseignants/staff/admin — file de validation des justifications. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (!['TEACHER', 'STAFF', 'ADMIN'].includes(payload.role)) {
    return deny(reply, 403, 'Forbidden');
  }
  request.planningUser = payload;
}
